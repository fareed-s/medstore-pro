const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../utils/errorHandler');

router.use(protect, authorize('SuperAdmin', 'StoreAdmin'));

router.get('/', asyncHandler(async (req, res) => {
  const { module, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (req.user.storeId) filter.storeId = req.user.storeId;
  if (module) filter.module = module;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59');
  }
  const total = await ActivityLog.countDocuments(filter);
  const data = await ActivityLog.find(filter)
    .populate('userId', 'name role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
}));

module.exports = router;
