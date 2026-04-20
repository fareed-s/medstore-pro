const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');
const StockAdjustment = require('../models/StockAdjustment');
const { asyncHandler } = require('../utils/errorHandler');
const { addDays, differenceInDays } = require('date-fns');

// Recalculate total stock for a medicine from all active batches
const recalcStock = async (medicineId, storeId) => {
  const mongoose = require('mongoose');
  let sid, mid;
  try { sid = new mongoose.Types.ObjectId(storeId.toString()); } catch { sid = storeId; }
  try { mid = new mongoose.Types.ObjectId(medicineId.toString()); } catch { mid = medicineId; }
  
  const result = await Batch.aggregate([
    { $match: { medicineId: mid, storeId: sid, isExpired: false, remainingQty: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$remainingQty' } } },
  ]);
  const total = result.length > 0 ? result[0].total : 0;
  await Medicine.findByIdAndUpdate(medicineId, { currentStock: total });
  return total;
};

// @desc    Get batches for a medicine
exports.getBatches = asyncHandler(async (req, res) => {
  const { medicineId, showEmpty, showExpired } = req.query;
  const storeId = req.user.storeId;
  const filter = { storeId };

  if (medicineId) filter.medicineId = medicineId;
  if (!showEmpty) filter.remainingQty = { $gt: 0 };
  if (!showExpired) filter.isExpired = false;

  const batches = await Batch.find(filter)
    .populate('medicineId', 'medicineName genericName category')
    .sort({ expiryDate: 1 });

  res.json({ success: true, data: batches });
});

// @desc    Create new batch (add stock)
exports.createBatch = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { medicineId, batchNumber, expiryDate, quantity, costPrice, salePrice, mrp, notes } = req.body;

  const medicine = await Medicine.findOne({ _id: medicineId, storeId });
  if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

  const batch = await Batch.create({
    storeId,
    medicineId,
    batchNumber,
    expiryDate: new Date(expiryDate),
    quantity,
    remainingQty: quantity,
    costPrice: costPrice || medicine.costPrice,
    salePrice: salePrice || medicine.salePrice,
    mrp: mrp || medicine.mrp,
    notes,
    addedBy: req.user._id,
  });

  // Update medicine cost/price if provided
  if (costPrice) medicine.costPrice = costPrice;
  if (salePrice) medicine.salePrice = salePrice;
  if (mrp) medicine.mrp = mrp;
  await medicine.save();

  // Recalc stock
  const newStock = await recalcStock(medicine._id, storeId);

  // Log adjustment
  await StockAdjustment.create({
    storeId,
    medicineId,
    batchId: batch._id,
    type: 'increase',
    quantity,
    previousQty: medicine.currentStock,
    newQty: newStock,
    reason: 'Opening Stock',
    adjustedBy: req.user._id,
    status: 'approved',
  });

  res.status(201).json({ success: true, data: batch, newStock });
});

// @desc    Update batch
exports.updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

  const { batchNumber, expiryDate, remainingQty, costPrice, salePrice, mrp } = req.body;
  if (batchNumber) batch.batchNumber = batchNumber;
  if (expiryDate) batch.expiryDate = new Date(expiryDate);
  if (remainingQty !== undefined) batch.remainingQty = remainingQty;
  if (costPrice !== undefined) batch.costPrice = costPrice;
  if (salePrice !== undefined) batch.salePrice = salePrice;
  if (mrp !== undefined) batch.mrp = mrp;

  await batch.save();
  await recalcStock(batch.medicineId, batch.storeId);

  res.json({ success: true, data: batch });
});

// @desc    Get expiry dashboard data
exports.getExpiryDashboard = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const now = new Date();

  const [expired, within30, within60, within90] = await Promise.all([
    Batch.find({ storeId, expiryDate: { $lt: now }, remainingQty: { $gt: 0 } })
      .populate('medicineId', 'medicineName genericName salePrice')
      .sort({ expiryDate: 1 }),
    Batch.find({ storeId, expiryDate: { $gte: now, $lte: addDays(now, 30) }, remainingQty: { $gt: 0 } })
      .populate('medicineId', 'medicineName genericName salePrice')
      .sort({ expiryDate: 1 }),
    Batch.find({ storeId, expiryDate: { $gte: addDays(now, 31), $lte: addDays(now, 60) }, remainingQty: { $gt: 0 } })
      .populate('medicineId', 'medicineName genericName salePrice')
      .sort({ expiryDate: 1 }),
    Batch.find({ storeId, expiryDate: { $gte: addDays(now, 61), $lte: addDays(now, 90) }, remainingQty: { $gt: 0 } })
      .populate('medicineId', 'medicineName genericName salePrice')
      .sort({ expiryDate: 1 }),
  ]);

  // Calculate values
  const calcValue = (batches) => batches.reduce((sum, b) => sum + (b.remainingQty * (b.medicineId?.salePrice || 0)), 0);

  res.json({
    success: true,
    data: {
      expired: { count: expired.length, value: calcValue(expired), items: expired },
      within30: { count: within30.length, value: calcValue(within30), items: within30 },
      within60: { count: within60.length, value: calcValue(within60), items: within60 },
      within90: { count: within90.length, value: calcValue(within90), items: within90 },
    },
  });
});

// @desc    Stock adjustment
exports.adjustStock = asyncHandler(async (req, res) => {
  const { medicineId, batchId, type, quantity, reason, notes } = req.body;
  const storeId = req.user.storeId;

  const medicine = await Medicine.findOne({ _id: medicineId, storeId });
  if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

  const previousQty = medicine.currentStock;

  if (batchId) {
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    if (type === 'increase') {
      batch.remainingQty += quantity;
      batch.quantity += quantity;
    } else {
      if (batch.remainingQty < quantity) {
        return res.status(400).json({ success: false, message: 'Insufficient batch quantity' });
      }
      batch.remainingQty -= quantity;
    }
    await batch.save();
  }

  const newStock = await recalcStock(medicine._id, storeId);

  const adjustment = await StockAdjustment.create({
    storeId,
    medicineId,
    batchId,
    type,
    quantity,
    previousQty,
    newQty: newStock,
    reason,
    notes,
    adjustedBy: req.user._id,
    status: req.user.role === 'StoreAdmin' ? 'approved' : 'pending',
  });

  res.json({ success: true, data: adjustment, newStock });
});

// @desc    Get stock adjustments history
exports.getAdjustments = asyncHandler(async (req, res) => {
  const { medicineId, page = 1, limit = 25 } = req.query;
  const filter = { storeId: req.user.storeId };
  if (medicineId) filter.medicineId = medicineId;

  const total = await StockAdjustment.countDocuments(filter);
  const adjustments = await StockAdjustment.find(filter)
    .populate('medicineId', 'medicineName')
    .populate('adjustedBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ success: true, data: adjustments, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

module.exports.recalcStock = recalcStock;
