const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const User = require('../models/User');
const Category = require('../models/Category');
const { asyncHandler } = require('../utils/errorHandler');
const { addDays } = require('date-fns');
const mongoose = require('mongoose');

const toOid = (id) => { try { return new mongoose.Types.ObjectId(id.toString()); } catch { return null; } };

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  if (!storeId) return res.json({ success: true, data: { stats: {}, stockValue: { retailValue: 0, costValue: 0 }, topCategories: [], lowStockItems: [] } });

  const now = new Date();
  const sid = toOid(storeId);

  const [totalMedicines, activeProducts, outOfStock, lowStock, expiring30, expired, totalStaff, categories] = await Promise.all([
    Medicine.countDocuments({ storeId }),
    Medicine.countDocuments({ storeId, isActive: true }),
    Medicine.countDocuments({ storeId, isActive: true, currentStock: 0, isStockTracked: true }),
    Medicine.countDocuments({ storeId, isActive: true, isStockTracked: true, $expr: { $lte: ['$currentStock', '$lowStockThreshold'] }, currentStock: { $gt: 0 } }),
    Batch.countDocuments({ storeId, expiryDate: { $gte: now, $lte: addDays(now, 30) }, remainingQty: { $gt: 0 } }),
    Batch.countDocuments({ storeId, expiryDate: { $lt: now }, remainingQty: { $gt: 0 } }),
    User.countDocuments({ storeId, isActive: true }),
    Category.countDocuments({ storeId, isActive: true }),
  ]);

  const stockAgg = sid ? await Medicine.aggregate([
    { $match: { storeId: sid, isActive: true } },
    { $group: { _id: null, retailValue: { $sum: { $multiply: ['$currentStock', '$salePrice'] } }, costValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } } } },
  ]) : [];

  const topCategories = sid ? await Medicine.aggregate([
    { $match: { storeId: sid, isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 }, totalStock: { $sum: '$currentStock' } } },
    { $sort: { count: -1 } }, { $limit: 8 },
  ]) : [];

  const lowStockItems = await Medicine.find({ storeId, isActive: true, isStockTracked: true, $expr: { $lte: ['$currentStock', '$lowStockThreshold'] } })
    .select('medicineName genericName currentStock lowStockThreshold category').sort({ currentStock: 1 }).limit(10);

  res.json({ success: true, data: { stats: { totalMedicines, activeProducts, outOfStock, lowStock, expiring30, expired, totalStaff, categories }, stockValue: stockAgg[0] || { retailValue: 0, costValue: 0 }, topCategories, lowStockItems } });
});
