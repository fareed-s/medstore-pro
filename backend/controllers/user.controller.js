const User = require('../models/User');
const { asyncHandler } = require('../utils/errorHandler');
const { MODULES, ACTIONS, defaultPermissionsFor } = require('../config/modules');

// Sanitise an incoming permissions object so users can only set known module/action pairs to booleans.
function sanitizeMatrix(input) {
  if (!input || typeof input !== 'object') return null;
  const allowedKeys = new Set(MODULES.map(m => m.key));
  const out = {};
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) continue;
    const row = input[key] || {};
    out[key] = {};
    for (const a of ACTIONS) out[key][a] = !!row[a];
  }
  return out;
}

// GET /api/users — list staff in the same store
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ storeId: req.user.storeId, role: { $ne: 'SuperAdmin' } })
    .select('-password')
    .sort({ role: 1, name: 1 });
  res.json({ success: true, data: users });
});

// GET /api/users/modules — module catalogue + role defaults for the matrix UI
exports.getModuleCatalog = asyncHandler(async (req, res) => {
  const roles = ['StoreAdmin','Pharmacist','Cashier','InventoryStaff'];
  const defaults = roles.reduce((a, r) => { a[r] = defaultPermissionsFor(r); return a; }, {});
  res.json({ success: true, data: { modules: MODULES, actions: ACTIONS, defaults } });
});

// POST /api/users — create staff
exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, isActive, modulePermissions } = req.body;
  const storeId = req.user.storeId;

  const existing = await User.findOne({ email, storeId });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already exists in this store' });
  }

  const user = new User({ name, email, password, phone, role, storeId });
  user.setDefaultPermissions();
  if (typeof isActive === 'boolean') user.isActive = isActive;

  const sanitized = sanitizeMatrix(modulePermissions);
  if (sanitized) {
    user.modulePermissions = { ...user.modulePermissions, ...sanitized };
    user.markModified('modulePermissions');
  }
  await user.save();

  const userData = user.toObject();
  delete userData.password;
  res.status(201).json({ success: true, data: userData });
});

// PUT /api/users/:id — update staff
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, phone, role, isActive, modulePermissions, permissions } = req.body;
  const user = await User.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role && role !== user.role) {
    user.role = role;
    user.setDefaultPermissions();
  }
  if (isActive !== undefined) user.isActive = isActive;

  // Legacy flag-style permissions (back-compat)
  if (permissions) user.permissions = { ...user.permissions, ...permissions };

  // New module matrix overrides
  const sanitized = sanitizeMatrix(modulePermissions);
  if (sanitized) {
    user.modulePermissions = { ...user.modulePermissions, ...sanitized };
    user.markModified('modulePermissions');
  }

  await user.save();
  res.json({ success: true, data: user });
});

// DELETE /api/users/:id — soft delete (deactivate)
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'StoreAdmin') {
    return res.status(400).json({ success: false, message: 'Cannot delete store admin' });
  }
  user.isActive = false;
  await user.save();
  res.json({ success: true, message: 'User deactivated' });
});

// PUT /api/users/:id/reset-password
exports.resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.password = req.body.password;
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  res.json({ success: true, message: 'Password reset successful' });
});
