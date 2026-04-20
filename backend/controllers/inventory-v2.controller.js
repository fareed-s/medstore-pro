const { toObjectId } = require('../utils/objectId');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const StockAdjustment = require('../models/StockAdjustment');
const StockCount = require('../models/StockCount');
const StockMovement = require('../models/StockMovement');
const Counter = require('../models/Counter');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../utils/errorHandler');
const { recalcStock } = require('./batch.controller');
const { addDays, subDays, differenceInDays, format } = require('date-fns');

// ══════════════════════════════════════
// STOCK MOVEMENT REGISTER
// ══════════════════════════════════════

// Helper: log stock movement
exports.logMovement = async ({ storeId, medicineId, batchId, batchNumber, movementType, quantity, direction, balanceBefore, balanceAfter, unitCost, referenceType, referenceId, referenceNo, notes, userId }) => {
  return StockMovement.create({
    storeId, medicineId, batchId, batchNumber, movementType, quantity, direction,
    balanceBefore, balanceAfter, unitCost, totalValue: quantity * (unitCost || 0),
    referenceType, referenceId, referenceNo, notes, userId,
  });
};

// @desc    Get stock movements for a medicine or store-wide
exports.getStockMovements = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { medicineId, movementType, direction, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
  const filter = { storeId };

  if (medicineId) filter.medicineId = medicineId;
  if (movementType) filter.movementType = movementType;
  if (direction) filter.direction = direction;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59');
  }

  const total = await StockMovement.countDocuments(filter);
  const movements = await StockMovement.find(filter)
    .populate('medicineId', 'medicineName genericName barcode')
    .populate('userId', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    success: true, data: movements,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
  });
});

// @desc    Movement summary by type for date range
exports.getMovementSummary = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const mongoose = require('mongoose');
  const sid = toObjectId(storeId);
  const { dateFrom, dateTo } = req.query;

  const matchStage = { storeId: sid };
  if (dateFrom || dateTo) {
    matchStage.createdAt = {};
    if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
    if (dateTo) matchStage.createdAt.$lte = new Date(dateTo + 'T23:59:59');
  }

  const summary = await StockMovement.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { type: '$movementType', direction: '$direction' },
        totalQty: { $sum: '$quantity' },
        totalValue: { $sum: '$totalValue' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.direction': 1, totalQty: -1 } },
  ]);

  res.json({ success: true, data: summary });
});

// ══════════════════════════════════════
// PHYSICAL STOCK COUNT
// ══════════════════════════════════════

// @desc    Start a new stock count
exports.createStockCount = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { category, rackLocation } = req.body;

  const countNo = await Counter.getNext(storeId, 'stockcount', 'SC');

  // Get medicines to count
  const filter = { storeId, isActive: true, isStockTracked: true };
  if (category) filter.category = category;
  if (rackLocation) filter.rackLocation = { $regex: rackLocation, $options: 'i' };

  const medicines = await Medicine.find(filter)
    .select('medicineName currentStock costPrice')
    .sort({ rackLocation: 1, medicineName: 1 });

  const items = medicines.map(m => ({
    medicineId: m._id,
    medicineName: m.medicineName,
    systemQty: m.currentStock,
    physicalQty: m.currentStock, // Default same as system
    variance: 0,
    varianceValue: 0,
  }));

  const count = await StockCount.create({
    storeId, countNo, category, rackLocation,
    items,
    totalItems: items.length,
    countedBy: req.user._id,
    status: 'in_progress',
  });

  res.status(201).json({ success: true, data: count });
});

// @desc    Update stock count items
exports.updateStockCount = asyncHandler(async (req, res) => {
  const count = await StockCount.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!count) return res.status(404).json({ success: false, message: 'Stock count not found' });
  if (count.status !== 'in_progress') {
    return res.status(400).json({ success: false, message: 'Count already finalized' });
  }

  const { items } = req.body;
  let totalVariance = 0, positiveVariance = 0, negativeVariance = 0, totalVarianceValue = 0;

  for (const update of items) {
    const existing = count.items.find(i => i.medicineId.toString() === update.medicineId);
    if (existing) {
      existing.physicalQty = update.physicalQty;
      existing.variance = update.physicalQty - existing.systemQty;
      existing.reason = update.reason || '';

      // Get cost for value calc
      const med = await Medicine.findById(update.medicineId).select('costPrice');
      existing.varianceValue = existing.variance * (med?.costPrice || 0);

      totalVariance += Math.abs(existing.variance);
      totalVarianceValue += existing.varianceValue;
      if (existing.variance > 0) positiveVariance += existing.variance;
      if (existing.variance < 0) negativeVariance += Math.abs(existing.variance);
    }
  }

  count.totalVariance = totalVariance;
  count.positiveVariance = positiveVariance;
  count.negativeVariance = negativeVariance;
  count.totalVarianceValue = totalVarianceValue;
  await count.save();

  res.json({ success: true, data: count });
});

// @desc    Approve stock count — apply adjustments
exports.approveStockCount = asyncHandler(async (req, res) => {
  const count = await StockCount.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!count) return res.status(404).json({ success: false, message: 'Stock count not found' });
  if (count.status !== 'in_progress' && count.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'Count cannot be approved' });
  }

  const storeId = req.user.storeId;

  // Apply adjustments for items with variance
  for (const item of count.items) {
    if (item.variance === 0) continue;

    const type = item.variance > 0 ? 'increase' : 'decrease';
    const absQty = Math.abs(item.variance);
    const medicine = await Medicine.findById(item.medicineId);
    if (!medicine) continue;

    const prevStock = medicine.currentStock;

    // Find the most relevant batch to adjust
    const batch = await Batch.findOne({
      storeId, medicineId: item.medicineId,
      remainingQty: { $gt: 0 }, isExpired: false,
    }).sort({ expiryDate: 1 });

    if (batch) {
      if (type === 'increase') {
        batch.remainingQty += absQty;
        batch.quantity += absQty;
      } else {
        batch.remainingQty = Math.max(0, batch.remainingQty - absQty);
      }
      await batch.save();
    }

    const newStock = await recalcStock(item.medicineId, storeId);

    await StockAdjustment.create({
      storeId, medicineId: item.medicineId,
      batchId: batch?._id,
      type, quantity: absQty,
      previousQty: prevStock, newQty: newStock,
      reason: 'Count Correction',
      notes: `Stock count ${count.countNo}: ${item.reason || 'Physical count variance'}`,
      adjustedBy: count.countedBy,
      approvedBy: req.user._id,
      status: 'approved',
    });

    // Log movement
    await exports.logMovement({
      storeId, medicineId: item.medicineId,
      batchId: batch?._id, batchNumber: batch?.batchNumber,
      movementType: type === 'increase' ? 'adjustment_in' : 'adjustment_out',
      quantity: absQty,
      direction: type === 'increase' ? 'in' : 'out',
      balanceBefore: prevStock, balanceAfter: newStock,
      unitCost: medicine.costPrice,
      referenceType: 'StockCount', referenceId: count._id,
      referenceNo: count.countNo,
      notes: `Count correction: ${item.reason || ''}`,
      userId: req.user._id,
    });
  }

  count.status = 'approved';
  count.approvedBy = req.user._id;
  count.approvedAt = new Date();
  await count.save();

  await ActivityLog.create({
    storeId, userId: req.user._id,
    action: 'Stock count approved', module: 'inventory',
    details: `${count.countNo} — ${count.items.filter(i => i.variance !== 0).length} items adjusted`,
    entityId: count._id, entityType: 'StockCount',
  });

  res.json({ success: true, data: count, message: 'Stock count approved and adjustments applied' });
});

// @desc    List stock counts
exports.getStockCounts = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { storeId: req.user.storeId };
  if (status) filter.status = status;

  const total = await StockCount.countDocuments(filter);
  const counts = await StockCount.find(filter)
    .populate('countedBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ success: true, data: counts, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

// @desc    Get single stock count
exports.getStockCount = asyncHandler(async (req, res) => {
  const count = await StockCount.findOne({ _id: req.params.id, storeId: req.user.storeId })
    .populate('countedBy', 'name')
    .populate('approvedBy', 'name');
  if (!count) return res.status(404).json({ success: false, message: 'Stock count not found' });
  res.json({ success: true, data: count });
});

// ══════════════════════════════════════
// DEAD STOCK ANALYSIS
// ══════════════════════════════════════

exports.getDeadStock = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { days = 90 } = req.query;
  const mongoose = require('mongoose');
  const sid = toObjectId(storeId);
  const cutoffDate = subDays(new Date(), parseInt(days));

  // Get all active medicines with stock
  const medicines = await Medicine.find({
    storeId, isActive: true, currentStock: { $gt: 0 },
  }).select('medicineName genericName category currentStock costPrice salePrice rackLocation').lean();

  // Get medicines that had sales in the period
  const Sale = require('../models/Sale');
  const soldMedicines = await Sale.aggregate([
    { $match: { storeId: sid, status: { $in: ['completed', 'partial_return'] }, createdAt: { $gte: cutoffDate } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.medicineId', totalSold: { $sum: '$items.quantity' } } },
  ]);

  const soldMap = {};
  soldMedicines.forEach(s => { soldMap[s._id.toString()] = s.totalSold; });

  // Dead stock = medicines with stock but 0 sales in period
  const deadStock = medicines
    .filter(m => !soldMap[m._id.toString()])
    .map(m => ({
      ...m,
      deadDays: parseInt(days),
      stockValue: m.currentStock * (m.costPrice || 0),
      retailValue: m.currentStock * (m.salePrice || 0),
    }))
    .sort((a, b) => b.stockValue - a.stockValue);

  const totalDeadValue = deadStock.reduce((s, d) => s + d.stockValue, 0);
  const totalRetailValue = deadStock.reduce((s, d) => s + d.retailValue, 0);

  res.json({
    success: true,
    data: {
      items: deadStock,
      summary: {
        count: deadStock.length,
        totalDeadValue,
        totalRetailValue,
        periodDays: parseInt(days),
      },
    },
  });
});

// ══════════════════════════════════════
// FAST / SLOW MOVERS ANALYSIS
// ══════════════════════════════════════

exports.getMoversAnalysis = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { days = 30, type = 'fast', limit = 20 } = req.query;
  const mongoose = require('mongoose');
  const sid = toObjectId(storeId);
  const cutoffDate = subDays(new Date(), parseInt(days));

  const Sale = require('../models/Sale');
  const sortDir = type === 'fast' ? -1 : 1;

  const movers = await Sale.aggregate([
    { $match: { storeId: sid, status: { $in: ['completed', 'partial_return'] }, createdAt: { $gte: cutoffDate } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.medicineId',
        medicineName: { $first: '$items.medicineName' },
        genericName: { $first: '$items.genericName' },
        totalQty: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.lineTotal' },
        salesCount: { $sum: 1 },
      },
    },
    { $sort: { totalQty: sortDir } },
    { $limit: parseInt(limit) },
  ]);

  // Enrich with current stock
  for (const m of movers) {
    const med = await Medicine.findById(m._id).select('currentStock category rackLocation');
    if (med) {
      m.currentStock = med.currentStock;
      m.category = med.category;
      m.rackLocation = med.rackLocation;
      m.avgDailySales = parseFloat((m.totalQty / parseInt(days)).toFixed(2));
      m.daysOfStock = m.avgDailySales > 0 ? Math.round(med.currentStock / m.avgDailySales) : null;
    }
  }

  res.json({ success: true, data: movers });
});

// ══════════════════════════════════════
// RACK LOCATION MANAGEMENT
// ══════════════════════════════════════

exports.getRackLocations = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const mongoose = require('mongoose');
  const sid = toObjectId(storeId);

  const racks = await Medicine.aggregate([
    { $match: { storeId: sid, isActive: true, rackLocation: { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: '$rackLocation',
        productCount: { $sum: 1 },
        totalStock: { $sum: '$currentStock' },
        outOfStock: { $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data: racks });
});

exports.getMedicinesByRack = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { rack } = req.params;

  const medicines = await Medicine.find({
    storeId, isActive: true,
    rackLocation: { $regex: rack, $options: 'i' },
  })
    .select('medicineName genericName currentStock salePrice category rackLocation lowStockThreshold')
    .sort({ medicineName: 1 });

  res.json({ success: true, data: medicines });
});

exports.updateRackLocation = asyncHandler(async (req, res) => {
  const { medicineId, rackLocation } = req.body;
  const medicine = await Medicine.findOneAndUpdate(
    { _id: medicineId, storeId: req.user.storeId },
    { rackLocation },
    { new: true }
  );
  if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
  res.json({ success: true, data: medicine });
});

exports.bulkUpdateRack = asyncHandler(async (req, res) => {
  const { updates } = req.body; // [{medicineId, rackLocation}]
  const storeId = req.user.storeId;
  let updated = 0;

  for (const u of updates) {
    await Medicine.findOneAndUpdate(
      { _id: u.medicineId, storeId },
      { rackLocation: u.rackLocation }
    );
    updated++;
  }

  res.json({ success: true, updated });
});

// ══════════════════════════════════════
// ENHANCED EXPIRY MANAGEMENT
// ══════════════════════════════════════

exports.markBatchExpired = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

  const prevQty = batch.remainingQty;
  batch.isExpired = true;
  const expiredQty = batch.remainingQty;
  batch.remainingQty = 0;
  await batch.save();

  const newStock = await recalcStock(batch.medicineId, batch.storeId);
  const medicine = await Medicine.findById(batch.medicineId);

  // Log adjustment
  await StockAdjustment.create({
    storeId: batch.storeId, medicineId: batch.medicineId,
    batchId: batch._id, type: 'decrease', quantity: expiredQty,
    previousQty: prevQty + newStock, newQty: newStock,
    reason: 'Expired', adjustedBy: req.user._id, status: 'approved',
  });

  // Log movement
  await exports.logMovement({
    storeId: batch.storeId, medicineId: batch.medicineId,
    batchId: batch._id, batchNumber: batch.batchNumber,
    movementType: 'expired', quantity: expiredQty, direction: 'out',
    balanceBefore: prevQty + newStock, balanceAfter: newStock,
    unitCost: medicine?.costPrice || 0,
    referenceType: 'Batch', referenceId: batch._id,
    notes: `Batch ${batch.batchNumber} marked expired`,
    userId: req.user._id,
  });

  res.json({ success: true, data: batch, message: `${expiredQty} units written off` });
});

// @desc    Expiry value report
exports.getExpiryValueReport = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const mongoose = require('mongoose');
  const sid = toObjectId(storeId);
  const now = new Date();

  const report = await Batch.aggregate([
    { $match: { storeId: sid, remainingQty: { $gt: 0 } } },
    {
      $addFields: {
        daysToExpiry: { $dateDiff: { startDate: now, endDate: '$expiryDate', unit: 'day' } },
        stockValue: { $multiply: ['$remainingQty', '$costPrice'] },
        retailValue: { $multiply: ['$remainingQty', { $ifNull: ['$salePrice', '$mrp'] }] },
      },
    },
    {
      $bucket: {
        groupBy: '$daysToExpiry',
        boundaries: [-Infinity, 0, 30, 60, 90, 180, 365, Infinity],
        default: 'other',
        output: {
          count: { $sum: 1 },
          totalQty: { $sum: '$remainingQty' },
          totalCostValue: { $sum: '$stockValue' },
          totalRetailValue: { $sum: '$retailValue' },
        },
      },
    },
  ]);

  const labels = { '-Infinity': 'Expired', '0': '0-30 days', '30': '31-60 days', '60': '61-90 days', '90': '91-180 days', '180': '181-365 days', '365': '365+ days' };

  const formatted = report.map(r => ({
    range: labels[String(r._id)] || String(r._id),
    ...r,
  }));

  res.json({ success: true, data: formatted });
});

// ══════════════════════════════════════
// AUTO-REORDER SUGGESTIONS
// ══════════════════════════════════════

exports.getReorderSuggestions = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;

  const medicines = await Medicine.find({
    storeId, isActive: true, isStockTracked: true,
    $expr: { $lte: ['$currentStock', '$reorderLevel'] },
  })
    .select('medicineName genericName manufacturer category currentStock reorderLevel reorderQuantity lowStockThreshold costPrice salePrice rackLocation')
    .sort({ currentStock: 1 });

  const suggestions = medicines.map(m => ({
    ...m.toObject(),
    suggestedQty: m.reorderQuantity || 50,
    estimatedCost: (m.reorderQuantity || 50) * (m.costPrice || 0),
    urgency: m.currentStock === 0 ? 'critical' : m.currentStock <= (m.lowStockThreshold / 2) ? 'high' : 'medium',
  }));

  const totalEstimatedCost = suggestions.reduce((s, m) => s + m.estimatedCost, 0);

  res.json({
    success: true,
    data: {
      items: suggestions,
      summary: {
        count: suggestions.length,
        critical: suggestions.filter(s => s.urgency === 'critical').length,
        high: suggestions.filter(s => s.urgency === 'high').length,
        totalEstimatedCost,
      },
    },
  });
});
