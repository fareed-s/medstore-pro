const { asyncHandler } = require('../utils/errorHandler');
const ControlledMedicine = require('../models/ControlledMedicine');
const ControlledPurchase = require('../models/ControlledPurchase');

const scope = (req) => ({ storeId: req.user.storeId });

const generateGRN = () => {
  const d = new Date();
  const yymmdd = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const rand = Math.random().toString(36).slice(-2).toUpperCase();
  return `GRN-CN-${yymmdd}-${ts}${rand}`;
};

// @desc    List purchases (newest first, paginated)
// @route   GET /api/controlled/purchases
exports.list = asyncHandler(async (req, res) => {
  const { search, from, to, page = 1, limit = 50 } = req.query;
  const filter = { ...scope(req) };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }
  if (search) {
    filter.$or = [
      { grnNumber: { $regex: search, $options: 'i' } },
      { supplierInvoiceNo: { $regex: search, $options: 'i' } },
      { supplierName: { $regex: search, $options: 'i' } },
    ];
  }

  const [total, purchases] = await Promise.all([
    ControlledPurchase.countDocuments(filter),
    ControlledPurchase.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
  ]);

  res.json({ success: true, data: purchases, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

// @desc    Get one
exports.getOne = asyncHandler(async (req, res) => {
  const item = await ControlledPurchase.findOne({ _id: req.params.id, ...scope(req) }).lean();
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: item });
});

// @desc    Create a purchase. For each item we PUSH a batch onto the
//          referenced ControlledMedicine, then write the immutable
//          purchase record. Mirror of ControlledSale's atomic flow.
// @route   POST /api/controlled/purchases
exports.create = asyncHandler(async (req, res) => {
  const {
    supplierName, supplierLicenseNumber, supplierAddress, supplierPhone,
    supplierInvoiceNo, supplierInvoiceDate,
    items, taxAmount = 0, notes,
  } = req.body || {};

  if (!supplierName || !supplierName.trim()) {
    return res.status(400).json({ success: false, message: 'Supplier name is required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one item is required' });
  }

  // ── Phase 1: validate every line and load referenced medicines.
  const medicineIds = [...new Set(items.map((i) => String(i.medicineId)))];
  const meds = await ControlledMedicine.find({ _id: { $in: medicineIds }, ...scope(req) });
  const medMap = new Map(meds.map((m) => [String(m._id), m]));

  for (const line of items) {
    if (!line.medicineId || !line.batchNumber || !line.expiryDate || !line.quantity || !line.costPrice) {
      return res.status(400).json({
        success: false,
        message: 'Each item needs medicineId, batchNumber, expiryDate, quantity and costPrice',
      });
    }
    if (!medMap.has(String(line.medicineId))) {
      return res.status(400).json({ success: false, message: `Medicine ${line.medicineId} not found in this module` });
    }
  }

  // ── Phase 2: push batches onto medicines. Track for rollback.
  const rollback = [];   // [{medId, batchId}]
  const snapshots = [];
  try {
    for (const line of items) {
      const med = medMap.get(String(line.medicineId));
      const newBatch = {
        batchNumber: String(line.batchNumber).trim(),
        expiryDate: new Date(line.expiryDate),
        quantity: Number(line.quantity),
        costPrice: Number(line.costPrice),
        mrp: Number(line.mrp) || med.defaultMrp || 0,
        salePrice: Number(line.salePrice) || med.defaultSalePrice || 0,
        source: supplierName,
        addedBy: req.user._id,
      };
      med.batches.push(newBatch);
      await med.save();
      // Mongoose hands the new subdoc id back via the last element after save.
      const created = med.batches[med.batches.length - 1];
      rollback.push({ medId: med._id, batchId: created._id });

      const lineTotal = +(newBatch.quantity * newBatch.costPrice).toFixed(2);
      snapshots.push({
        medicineId: med._id,
        medicineName: med.medicineName,
        schedule: med.schedule,
        batchNumber: newBatch.batchNumber,
        expiryDate: newBatch.expiryDate,
        quantity: newBatch.quantity,
        costPrice: newBatch.costPrice,
        mrp: newBatch.mrp,
        salePrice: newBatch.salePrice,
        createdBatchId: created._id,
        total: lineTotal,
      });
    }
  } catch (err) {
    // Roll back any batches we already pushed.
    for (const r of rollback.reverse()) {
      try {
        const m = await ControlledMedicine.findById(r.medId);
        const b = m?.batches?.id(r.batchId);
        if (b) { b.deleteOne(); await m.save(); }
      } catch { /* manual reconcile */ }
    }
    return res.status(500).json({ success: false, message: 'Stock-in failed: ' + err.message });
  }

  const subtotal = +snapshots.reduce((s, l) => s + l.total, 0).toFixed(2);
  const totalAmount = +(subtotal + Number(taxAmount || 0)).toFixed(2);

  // ── Phase 3: write the purchase record.
  let purchase;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      purchase = await ControlledPurchase.create({
        ...scope(req),
        grnNumber: generateGRN(),
        supplierInvoiceNo: supplierInvoiceNo?.trim() || '',
        supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : undefined,
        supplierName: supplierName.trim(),
        supplierLicenseNumber: supplierLicenseNumber?.trim() || '',
        supplierAddress: supplierAddress?.trim() || '',
        supplierPhone: supplierPhone?.trim() || '',
        items: snapshots,
        subtotal,
        taxAmount: Number(taxAmount) || 0,
        totalAmount,
        notes: notes?.trim() || '',
        receivedBy: req.user._id,
        receivedByName: req.user.name,
      });
      break;
    } catch (err) {
      if (err.code === 11000 && attempt < 2) continue;
      // Roll back batches if the purchase write fails.
      for (const r of rollback) {
        try {
          const m = await ControlledMedicine.findById(r.medId);
          const b = m?.batches?.id(r.batchId);
          if (b) { b.deleteOne(); await m.save(); }
        } catch { /* manual */ }
      }
      throw err;
    }
  }

  res.status(201).json({ success: true, data: purchase });
});
