const { asyncHandler } = require('../utils/errorHandler');
const ControlledMedicine = require('../models/ControlledMedicine');
const ControlledSale = require('../models/ControlledSale');
const ControlledPurchase = require('../models/ControlledPurchase');

const scope = (req) => ({ storeId: req.user.storeId });

const dateRange = (q) => {
  const range = {};
  if (q.from) range.$gte = new Date(q.from);
  if (q.to) {
    const t = new Date(q.to);
    t.setHours(23, 59, 59, 999);
    range.$lte = t;
  }
  return range;
};

// @desc    Sales summary — totals + per-schedule + per-day breakdowns
// @route   GET /api/controlled/reports/sales-summary
exports.salesSummary = asyncHandler(async (req, res) => {
  const range = dateRange(req.query);
  const match = { ...scope(req), isVoided: { $ne: true } };
  if (Object.keys(range).length) match.createdAt = range;

  const [totals, perSchedule, perDay, topMedicines] = await Promise.all([
    ControlledSale.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        salesCount: { $sum: 1 },
        revenue: { $sum: '$total' },
        units: { $sum: { $sum: '$items.quantity' } },
      } },
    ]),
    ControlledSale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.schedule',
        salesCount: { $sum: 1 },
        units: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' },
      } },
      { $sort: { revenue: -1 } },
    ]),
    ControlledSale.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        salesCount: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
      { $limit: 60 },     // cap so a 5-year filter can't explode the response
    ]),
    ControlledSale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.medicineId',
        medicineName: { $first: '$items.medicineName' },
        schedule: { $first: '$items.schedule' },
        units: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' },
      } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totals: totals[0] || { salesCount: 0, revenue: 0, units: 0 },
      perSchedule,
      perDay,
      topMedicines,
    },
  });
});

// @desc    Stock report — every medicine, current stock, batch breakdown,
//          flag low-stock + expiring (<60d) + expired.
// @route   GET /api/controlled/reports/stock
exports.stock = asyncHandler(async (req, res) => {
  const meds = await ControlledMedicine.find({ ...scope(req), isActive: true })
    .sort({ medicineName: 1 })
    .lean();

  const now = Date.now();
  const SIXTY_DAYS = 60 * 86400000;

  const rows = meds.map((m) => {
    const batches = (m.batches || []).map((b) => {
      const days = Math.floor((new Date(b.expiryDate).getTime() - now) / 86400000);
      return {
        ...b,
        daysToExpiry: days,
        isExpired: days < 0,
        expiringSoon: days >= 0 && days <= 60,
      };
    });
    const expiredUnits = batches.filter((b) => b.isExpired).reduce((s, b) => s + (b.quantity || 0), 0);
    const expiringUnits = batches.filter((b) => b.expiringSoon).reduce((s, b) => s + (b.quantity || 0), 0);
    return {
      _id: m._id,
      medicineName: m.medicineName,
      genericName: m.genericName,
      schedule: m.schedule,
      currentStock: m.currentStock || 0,
      lowStockThreshold: m.lowStockThreshold || 0,
      isLow: (m.currentStock || 0) <= (m.lowStockThreshold || 0),
      batches,
      expiredUnits,
      expiringUnits,
    };
  });

  const summary = {
    medicines: rows.length,
    totalUnits: rows.reduce((s, r) => s + r.currentStock, 0),
    lowCount: rows.filter((r) => r.isLow).length,
    expiringCount: rows.filter((r) => r.expiringUnits > 0).length,
    expiredCount: rows.filter((r) => r.expiredUnits > 0).length,
  };

  res.json({ success: true, data: { rows, summary } });
});

// @desc    Expiry dashboard — flatten every batch across active medicines
//          and bucket by days-to-expiry. Mirrors the main inventory's
//          /batches/expiry-dashboard so the UI shape matches 1:1.
// @route   GET /api/controlled/expiry-dashboard
exports.expiryDashboard = asyncHandler(async (req, res) => {
  const meds = await ControlledMedicine.find({ ...scope(req), isActive: true })
    .select('medicineName genericName schedule defaultSalePrice batches')
    .lean();

  const now = new Date();
  const after = (n) => new Date(now.getTime() + n * 86400000);

  const buckets = {
    expired:   { items: [] },
    within30:  { items: [] },
    within60:  { items: [] },
    within90:  { items: [] },
    within180: { items: [] },
  };

  for (const m of meds) {
    for (const b of (m.batches || [])) {
      if (!b.expiryDate || (b.quantity || 0) <= 0) continue;
      const exp = new Date(b.expiryDate);
      // Shape mirrors what the main ExpiryRow expects so a future refactor
      // could share the component if we want.
      const flat = {
        _id: b._id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        remainingQty: b.quantity,
        salePrice: b.salePrice || m.defaultSalePrice || 0,
        medicineId: {
          _id: m._id,
          medicineName: m.medicineName,
          genericName: m.genericName,
          schedule: m.schedule,
          salePrice: m.defaultSalePrice || 0,
        },
      };

      if      (exp < now)            buckets.expired.items.push(flat);
      else if (exp <= after(30))     buckets.within30.items.push(flat);
      else if (exp <= after(60))     buckets.within60.items.push(flat);
      else if (exp <= after(90))     buckets.within90.items.push(flat);
      else if (exp <= after(180))    buckets.within180.items.push(flat);
    }
  }

  for (const key of Object.keys(buckets)) {
    const b = buckets[key];
    b.items.sort((a, c) => new Date(a.expiryDate) - new Date(c.expiryDate));
    b.count = b.items.length;
    b.value = b.items.reduce((s, it) => s + (it.remainingQty * (it.salePrice || 0)), 0);
  }

  res.json({ success: true, data: buckets });
});

// @desc    Register report — flat chronological list of every sale line for
//          a given date range. Mirrors the legal Form 4 "narcotic register".
// @route   GET /api/controlled/reports/register
exports.register = asyncHandler(async (req, res) => {
  const range = dateRange(req.query);
  const match = { ...scope(req) };
  if (Object.keys(range).length) match.createdAt = range;

  const rows = await ControlledSale.aggregate([
    { $match: match },
    { $unwind: '$items' },
    { $sort: { createdAt: 1 } },
    { $project: {
      _id: 0,
      saleId: '$_id',
      invoiceNo: 1,
      isVoided: 1,
      date: '$createdAt',
      medicineName: '$items.medicineName',
      schedule: '$items.schedule',
      batchNumber: '$items.batchNumber',
      expiryDate: '$items.expiryDate',
      quantity: '$items.quantity',
      unitPrice: '$items.unitPrice',
      total: '$items.total',
      patientName: '$patient.name',
      patientPhone: '$patient.phone',
      patientCnic: '$patient.cnic',
      doctorName: '$doctor.name',
      doctorReg: '$doctor.registrationNumber',
      soldByName: 1,
    } },
  ]);

  res.json({ success: true, data: rows, count: rows.length });
});
