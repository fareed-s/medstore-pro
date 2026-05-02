const Store = require('../models/Store');
const { asyncHandler } = require('../utils/errorHandler');
const { invalidateStoreCache } = require('../middleware/auth');

// @desc    Get current store
exports.getStore = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.user.storeId);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
  res.json({ success: true, data: store });
});

// @desc    Update store
exports.updateStore = asyncHandler(async (req, res) => {
  const allowed = ['storeName', 'phone', 'address', 'logo', 'drugLicenseNumber', 'drugLicenseExpiry', 'gstNumber', 'settings'];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const store = await Store.findByIdAndUpdate(req.user.storeId, updates, { new: true, runValidators: true });
  res.json({ success: true, data: store });
});

// @desc    Update store settings
exports.updateSettings = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.user.storeId);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  const current = store.settings ? (typeof store.settings.toObject === 'function' ? store.settings.toObject() : store.settings) : {};
  store.settings = { ...current, ...req.body };
  await store.save();
  invalidateStoreCache(store._id);
  res.json({ success: true, data: store.settings });
});

// @desc    Upload / replace store logo. Returns the public URL the frontend
//          should use (relative to /uploads, served by express + nginx).
exports.uploadStoreLogo = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No logo file provided' });

  const url = `/uploads/logos/${req.file.filename}`;
  const store = await Store.findByIdAndUpdate(
    req.user.storeId,
    { logo: url },
    { new: true }
  );
  invalidateStoreCache(store._id);
  res.json({ success: true, data: { logo: url } });
});
