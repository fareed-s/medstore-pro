const Notification = require('../models/Notification');
const { asyncHandler } = require('../utils/errorHandler');

exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { storeId: req.user.storeId };
  if (req.user.role !== 'StoreAdmin' && req.user.role !== 'SuperAdmin') filter.userId = req.user._id;
  if (unreadOnly === 'true') filter.isRead = false;

  const total = await Notification.countDocuments(filter);
  const unread = await Notification.countDocuments({ ...filter, isRead: false });
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: notifications, unread, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

exports.markRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ success: true });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const filter = { storeId: req.user.storeId, isRead: false };
  if (req.user.role !== 'StoreAdmin' && req.user.role !== 'SuperAdmin') filter.userId = req.user._id;
  await Notification.updateMany(filter, { isRead: true });
  res.json({ success: true });
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});
