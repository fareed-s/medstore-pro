const User = require('../models/User');
const { asyncHandler } = require('../utils/errorHandler');

// @desc    Get all users for store
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ storeId: req.user.storeId, role: { $ne: 'SuperAdmin' } })
    .select('-password')
    .sort({ role: 1, name: 1 });
  res.json({ success: true, data: users });
});

// @desc    Create user (staff)
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  const storeId = req.user.storeId;

  const existing = await User.findOne({ email, storeId });
  if (existing) return res.status(400).json({ success: false, message: 'Email already exists in this store' });

  const user = new User({ name, email, password, phone, role, storeId });
  user.setDefaultPermissions();
  await user.save();

  const userData = user.toObject();
  delete userData.password;

  res.status(201).json({ success: true, data: userData });
});

// @desc    Update user
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, phone, role, isActive, permissions } = req.body;
  const user = await User.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (role) { user.role = role; user.setDefaultPermissions(); }
  if (isActive !== undefined) user.isActive = isActive;
  if (permissions) user.permissions = { ...user.permissions, ...permissions };

  await user.save();
  res.json({ success: true, data: user });
});

// @desc    Delete (deactivate) user
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'StoreAdmin') return res.status(400).json({ success: false, message: 'Cannot delete store admin' });

  user.isActive = false;
  await user.save();
  res.json({ success: true, message: 'User deactivated' });
});

// @desc    Reset user password
exports.resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.password = req.body.password;
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  res.json({ success: true, message: 'Password reset successful' });
});
