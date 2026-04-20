const User = require('../models/User');
const Store = require('../models/Store');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const slugify = require('slugify');

// Helper: send token response via httpOnly cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const isProd = process.env.NODE_ENV === 'production';
  const options = {
    expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // 'none' required for cross-origin cookies
  };

  const userData = {
    _id: user._id, name: user.name, email: user.email, role: user.role,
    phone: user.phone, storeId: user.storeId, permissions: user.permissions, avatar: user.avatar,
  };

  // Send token in BOTH cookie and body — frontend can use either
  res.status(statusCode).cookie('token', token, options).json({
    success: true, token, user: userData,
  });
};

// @desc    Register new store + admin user
// @route   POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { storeName, email, password, phone, ownerName, address } = req.body;

  // Check if email exists
  const existingUser = await User.findOne({ email, role: { $in: ['StoreAdmin', 'SuperAdmin'] } });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  // Create store
  const store = await Store.create({
    storeName,
    slug: slugify(storeName, { lower: true, strict: true }) + '-' + Date.now().toString(36),
    email,
    phone,
    ownerName,
    ownerPhone: phone,
    ownerEmail: email,
    address: address || {},
    plan: 'Free Trial',
    planStartDate: new Date(),
    planEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
    maxProducts: 100,
    maxStaff: 2,
    isApproved: true, // Auto-approve for dev — change in production
  });

  // Create store admin user
  const user = new User({
    name: ownerName,
    email,
    password,
    phone,
    role: 'StoreAdmin',
    storeId: store._id,
  });
  user.setDefaultPermissions();
  await user.save();

  // Log activity
  await ActivityLog.create({
    storeId: store._id,
    userId: user._id,
    action: 'Store registered',
    module: 'auth',
    details: `New store "${storeName}" registered`,
    entityId: store._id,
    entityType: 'Store',
  });

  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email, isActive: true }).select('+password');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  // Check lock
  if (user.lockUntil && user.lockUntil > new Date()) {
    return res.status(423).json({ success: false, message: 'Account temporarily locked. Try again later.' });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    // Use findByIdAndUpdate to avoid triggering pre-save hook (which could re-hash password)
    const attempts = (user.loginAttempts || 0) + 1;
    const updateFields = { loginAttempts: attempts };
    if (attempts >= 5) {
      updateFields.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await User.findByIdAndUpdate(user._id, updateFields);
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  // Reset attempts on successful login — use findByIdAndUpdate to be safe
  await User.findByIdAndUpdate(user._id, {
    loginAttempts: 0,
    $unset: { lockUntil: 1 },
    lastLogin: new Date(),
  });

  await ActivityLog.create({
    storeId: user.storeId,
    userId: user._id,
    action: 'User logged in',
    module: 'auth',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  sendTokenResponse(user, 200, res);
});

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('storeId', 'storeName slug plan isApproved settings logo');
  res.json({ success: true, user });
});

// @desc    Logout
// @route   POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.json({ success: true, message: 'Logged out' });
});

// @desc    Update password
// @route   PUT /api/auth/password
exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    return res.status(400).json({ success: false, message: 'Current password incorrect' });
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, avatar },
    { new: true, runValidators: true }
  );
  res.json({ success: true, user });
});
