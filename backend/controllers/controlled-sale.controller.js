const { asyncHandler } = require('../utils/errorHandler');
const ControlledMedicine = require('../models/ControlledMedicine');
const ControlledSale = require('../models/ControlledSale');

const scope = (req) => ({ storeId: req.user.storeId });

// Format: CN-YYMMDD-<base36 ts><random>. Unique within store; index enforces it.
const generateInvoiceNo = () => {
  const d = new Date();
  const yymmdd = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const rand = Math.random().toString(36).slice(-2).toUpperCase();
  return `CN-${yymmdd}-${ts}${rand}`;
};

// Schedules that legally require patient + doctor records on every sale.
const REQUIRES_RX = new Set(['Schedule-H1', 'Schedule-X']);

// @desc    List sales for the current store
// @route   GET /api/controlled/sales
exports.list = asyncHandler(async (req, res) => {
  const { from, to, search, page = 1, limit = 50 } = req.query;
  const filter = { ...scope(req) };

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }
  if (search) {
    filter.$or = [
      { invoiceNo: { $regex: search, $options: 'i' } },
      { 'patient.name': { $regex: search, $options: 'i' } },
      { 'patient.phone': { $regex: search, $options: 'i' } },
      { 'patient.cnic': { $regex: search, $options: 'i' } },
      { 'doctor.name': { $regex: search, $options: 'i' } },
    ];
  }

  const [total, sales] = await Promise.all([
    ControlledSale.countDocuments(filter),
    ControlledSale.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
  ]);

  res.json({
    success: true,
    data: sales,
    pagination: { total, page: parseInt(page), limit: parseInt(limit) },
  });
});

// @desc    Get one sale (used for receipt re-print)
// @route   GET /api/controlled/sales/:id
exports.getOne = asyncHandler(async (req, res) => {
  const sale = await ControlledSale.findOne({ _id: req.params.id, ...scope(req) }).lean();
  if (!sale) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: sale });
});

// @desc    Create a sale. Validates stock per batch, decrements, then writes
//          the immutable record.
// @route   POST /api/controlled/sales
//
// body shape:
//   items:    [{ medicineId, batchId, quantity, unitPrice }]
//   patient:  { name, age, gender, address, phone, cnic }
//   doctor:   { name, registrationNumber, prescriptionDate, prescriptionImage }
//   discount, tax, paymentMethod, amountPaid, notes
exports.create = asyncHandler(async (req, res) => {
  const { items, patient = {}, doctor = {}, discount = 0, tax = 0,
          paymentMethod = 'cash', amountPaid = 0, notes } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one item is required' });
  }

  // ── Phase 1: load + validate every line BEFORE we mutate anything ──
  const medicineIds = [...new Set(items.map((i) => String(i.medicineId)))];
  const meds = await ControlledMedicine.find({
    _id: { $in: medicineIds },
    ...scope(req),
  });
  const medMap = new Map(meds.map((m) => [String(m._id), m]));

  // Snapshots we'll write into the sale + flag for whether Rx is mandatory.
  const snapshots = [];
  let rxRequired = false;

  for (const line of items) {
    if (!line.medicineId || !line.batchId || !line.quantity || line.quantity < 1) {
      return res.status(400).json({ success: false, message: 'Invalid line — medicineId, batchId, quantity required' });
    }
    const med = medMap.get(String(line.medicineId));
    if (!med || !med.isActive) {
      return res.status(400).json({ success: false, message: `Medicine ${line.medicineId} not found or archived` });
    }
    const batch = med.batches.id(line.batchId);
    if (!batch) {
      return res.status(400).json({ success: false, message: `Batch not found for ${med.medicineName}` });
    }
    if (batch.quantity < line.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${med.medicineName} batch ${batch.batchNumber} — only ${batch.quantity} left`,
      });
    }
    if (med.maxQuantityPerSale && line.quantity > med.maxQuantityPerSale) {
      return res.status(400).json({
        success: false,
        message: `${med.medicineName} cannot be sold more than ${med.maxQuantityPerSale} per sale (regulatory cap)`,
      });
    }

    if (REQUIRES_RX.has(med.schedule)) rxRequired = true;

    const unitPrice = Number(line.unitPrice) || batch.salePrice || med.defaultSalePrice || 0;
    const lineTotal = +(unitPrice * line.quantity).toFixed(2);

    snapshots.push({
      medicineId: med._id,
      batchId: batch._id,
      medicineName: med.medicineName,
      genericName: med.genericName,
      schedule: med.schedule,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: line.quantity,
      unitPrice,
      costPrice: batch.costPrice || 0,
      total: lineTotal,
    });
  }

  // ── Enforce Rx requirements when any Schedule-H1/X line is in the cart.
  if (rxRequired) {
    if (!patient.name || !patient.name.trim()) {
      return res.status(400).json({ success: false, message: 'Patient name is required for Schedule-H1 / Schedule-X items' });
    }
    if (!doctor.name || !doctor.name.trim()) {
      return res.status(400).json({ success: false, message: 'Prescribing doctor name is required for Schedule-H1 / Schedule-X items' });
    }
  }

  // ── Pricing roll-up
  const subtotal = +snapshots.reduce((s, l) => s + l.total, 0).toFixed(2);
  const total = +(subtotal - Number(discount || 0) + Number(tax || 0)).toFixed(2);
  if (total < 0) {
    return res.status(400).json({ success: false, message: 'Discount cannot exceed subtotal' });
  }
  const change = Math.max(0, +(Number(amountPaid || 0) - total).toFixed(2));

  // ── Phase 2: decrement batch quantities. Track what we decremented so we
  //           can roll back if a downstream save fails.
  const rollback = [];
  try {
    for (const line of items) {
      const med = medMap.get(String(line.medicineId));
      const batch = med.batches.id(line.batchId);
      batch.quantity -= line.quantity;
      await med.save();   // pre-save recomputes currentStock
      rollback.push({ medId: med._id, batchId: batch._id, qty: line.quantity });
    }
  } catch (err) {
    // Best-effort restore so a partial failure doesn't poison stock numbers.
    for (const r of rollback.reverse()) {
      try {
        const m = await ControlledMedicine.findById(r.medId);
        const b = m?.batches?.id(r.batchId);
        if (b) {
          b.quantity += r.qty;
          await m.save();
        }
      } catch { /* swallow — operator must reconcile manually */ }
    }
    return res.status(500).json({ success: false, message: 'Stock decrement failed: ' + err.message });
  }

  // ── Phase 3: write the immutable sale record.
  let invoiceNo;
  let sale;
  // Tiny retry loop in case the random invoice number happens to collide.
  for (let attempt = 0; attempt < 3; attempt++) {
    invoiceNo = generateInvoiceNo();
    try {
      sale = await ControlledSale.create({
        ...scope(req),
        invoiceNo,
        items: snapshots,
        patient: {
          name: patient.name?.trim() || '',
          age: patient.age ? Number(patient.age) : undefined,
          gender: patient.gender || '',
          address: patient.address?.trim() || '',
          phone: patient.phone?.trim() || '',
          cnic: patient.cnic?.trim() || '',
        },
        doctor: {
          name: doctor.name?.trim() || '',
          registrationNumber: doctor.registrationNumber?.trim() || '',
          prescriptionDate: doctor.prescriptionDate ? new Date(doctor.prescriptionDate) : undefined,
          prescriptionImage: doctor.prescriptionImage || '',
        },
        subtotal,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        total,
        paymentMethod,
        amountPaid: Number(amountPaid) || 0,
        changeReturned: change,
        notes: notes?.trim() || '',
        soldBy: req.user._id,
        soldByName: req.user.name,
        soldByRole: req.user.role,
      });
      break;
    } catch (err) {
      if (err.code === 11000 && attempt < 2) continue;   // duplicate invoiceNo, retry
      // Sale-write failed — roll back stock decrements
      for (const r of rollback) {
        try {
          const m = await ControlledMedicine.findById(r.medId);
          const b = m?.batches?.id(r.batchId);
          if (b) { b.quantity += r.qty; await m.save(); }
        } catch { /* manual reconciliation */ }
      }
      throw err;
    }
  }

  res.status(201).json({ success: true, data: sale });
});

// @desc    Void a sale. Phase 3 ships this without auto-restock — Phase 4
//          will add proper return flow with reason codes.
// @route   POST /api/controlled/sales/:id/void   body: { reason }
exports.voidSale = asyncHandler(async (req, res) => {
  if (!['StoreAdmin', 'SuperAdmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only StoreAdmin can void a sale' });
  }
  const sale = await ControlledSale.findOne({ _id: req.params.id, ...scope(req) });
  if (!sale) return res.status(404).json({ success: false, message: 'Not found' });
  if (sale.isVoided) {
    return res.status(400).json({ success: false, message: 'Already voided' });
  }
  sale.isVoided = true;
  sale.voidedAt = new Date();
  sale.voidedBy = req.user._id;
  sale.voidReason = req.body?.reason || '';
  await sale.save();
  res.json({ success: true, data: sale });
});

// @desc    Today's quick stats for the POS dashboard widget.
// @route   GET /api/controlled/sales/stats/today
exports.todayStats = asyncHandler(async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [agg] = await ControlledSale.aggregate([
    { $match: { ...scope(req), createdAt: { $gte: start }, isVoided: { $ne: true } } },
    { $group: {
      _id: null,
      count: { $sum: 1 },
      revenue: { $sum: '$total' },
      units: { $sum: { $sum: '$items.quantity' } },
    } },
  ]);

  res.json({
    success: true,
    data: {
      count: agg?.count || 0,
      revenue: agg?.revenue || 0,
      units: agg?.units || 0,
    },
  });
});
