const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const { asyncHandler } = require('../utils/errorHandler');
const mongoose = require('mongoose');

const toObjectId = (id) => {
  if (!id) return null;
  try { return new mongoose.Types.ObjectId(id.toString()); } catch { return null; }
};

exports.getInventoryOverview = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  if (!storeId) return res.json({ success: true, data: { totalProducts: 0, totalActive: 0, outOfStock: 0, lowStock: 0, totalBatches: 0, expiringSoon: 0, expired: 0, stockValue: { costValue: 0, retailValue: 0 } } });

  const now = new Date();
  const { addDays } = require('date-fns');
  const sid = toObjectId(storeId);

  const [totalProducts, totalActive, outOfStock, lowStock, totalBatches, expiringSoon, expired, stockValue] = await Promise.all([
    Medicine.countDocuments({ storeId }),
    Medicine.countDocuments({ storeId, isActive: true }),
    Medicine.countDocuments({ storeId, isActive: true, currentStock: 0, isStockTracked: true }),
    Medicine.countDocuments({ storeId, isActive: true, isStockTracked: true, $expr: { $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$lowStockThreshold'] }] } }),
    Batch.countDocuments({ storeId, remainingQty: { $gt: 0 } }),
    Batch.countDocuments({ storeId, expiryDate: { $gte: now, $lte: addDays(now, 30) }, remainingQty: { $gt: 0 } }),
    Batch.countDocuments({ storeId, expiryDate: { $lt: now }, remainingQty: { $gt: 0 } }),
    sid ? Medicine.aggregate([
      { $match: { storeId: sid, isActive: true } },
      { $group: { _id: null, costValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } }, retailValue: { $sum: { $multiply: ['$currentStock', '$salePrice'] } } } },
    ]) : [],
  ]);

  res.json({ success: true, data: { totalProducts, totalActive, outOfStock, lowStock, totalBatches, expiringSoon, expired, stockValue: stockValue[0] || { costValue: 0, retailValue: 0 } } });
});

exports.getCategoryStock = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  if (!storeId) return res.json({ success: true, data: [] });
  const sid = toObjectId(storeId);
  if (!sid) return res.json({ success: true, data: [] });

  const data = await Medicine.aggregate([
    { $match: { storeId: sid, isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 }, totalStock: { $sum: '$currentStock' }, totalValue: { $sum: { $multiply: ['$currentStock', '$salePrice'] } }, outOfStock: { $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] } } } },
    { $sort: { totalValue: -1 } },
  ]);

  res.json({ success: true, data });
});
