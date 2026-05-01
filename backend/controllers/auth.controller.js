const User = require('../models/User');
const Store = require('../models/Store');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { isExpired } = require('../utils/plans');
const { invalidateUserCache, invalidateStoreCache } = require('../middleware/auth');
const slugify = require('slugify');

// Helper: send token response via httpOnly cookie
const sendTokenResponse = async (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const isProd = process.env.NODE_ENV === 'production';
  const options = {
    expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // 'none' required for cross-origin cookies
  };

  // Inline subscription info so the frontend can render the expiry banner
  // immediately on login without an extra round-trip.
  let subscription = null;
  if (user.storeId) {
    const store = await Store.findById(user.storeId).select(
      'storeName slug plan planStartDate planEndDate planPrice trialDays isActive isApproved suspendedReason settings logo'
    );
    if (store) {
      subscription = {
        storeName: store.storeName,
        plan: store.plan,
        planStartDate: store.planStartDate,
        planEndDate: store.planEndDate,
        planPrice: store.planPrice,
        trialDays: store.trialDays,
        isActive: store.isActive,
        suspendedReason: store.suspendedReason,
      };
    }
  }

  const userData = {
    _id: user._id, name: user.name, email: user.email, role: user.role,
    phone: user.phone, storeId: user.storeId,
    permissions: user.permissions,
    modulePermissions: user.modulePermissions,
    avatar: user.avatar,
    subscription,
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
    plan: 'Trial',
    trialDays: 14,
    planPrice: 0,
    planStartDate: new Date(),
    planEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
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

  await sendTokenResponse(user, 201, res);
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

  // Block login if the user's store is suspended or its plan has expired.
  // SuperAdmin has no storeId, so this only affects tenant users.
  if (user.role !== 'SuperAdmin' && user.storeId) {
    const store = await Store.findById(user.storeId);
    if (!store) {
      return res.status(403).json({ success: false, message: 'Your store could not be found. Contact support.' });
    }
    if (!store.isApproved) {
      return res.status(403).json({ success: false, message: 'Your store is pending approval.' });
    }
    // Lazy auto-suspend if expired
    if (store.isActive && isExpired(store.planEndDate)) {
      store.isActive = false;
      store.suspendedReason = 'Plan expired';
      store.suspendedAt = new Date();
      await store.save();
    }
    if (!store.isActive) {
      return res.status(403).json({
        success: false,
        message: store.suspendedReason === 'Plan expired'
          ? 'Your subscription has expired. Please contact the administrator to renew your plan.'
          : (store.suspendedReason || 'Your store has been suspended. Please contact support.'),
        code: 'STORE_SUSPENDED',
      });
    }
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

  await sendTokenResponse(user, 200, res);
});

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('storeId', 'storeName slug plan planStartDate planEndDate planPrice trialDays isApproved isActive suspendedReason settings logo')
    .lean();

  // Mirror the same `subscription` shape the login response uses, so the
  // frontend has one consistent place to read expiry info from.
  if (user && user.storeId && typeof user.storeId === 'object') {
    const s = user.storeId;
    user.subscription = {
      storeName: s.storeName,
      plan: s.plan,
      planStartDate: s.planStartDate,
      planEndDate: s.planEndDate,
      planPrice: s.planPrice,
      trialDays: s.trialDays,
      isActive: s.isActive,
      suspendedReason: s.suspendedReason,
    };
  }

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
  invalidateUserCache(user._id);

  await sendTokenResponse(user, 200, res);
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
  if (user) invalidateUserCache(user._id);
  res.json({ success: true, user });
});

// @desc    Upload avatar image (multipart). Saves /uploads/avatars/<file>
//          and writes the URL onto user.avatar.
// @route   POST /api/auth/avatar
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const url = `/uploads/avatars/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: url },
    { new: true, runValidators: true }
  ).select('-password');
  if (user) invalidateUserCache(user._id);
  res.json({ success: true, avatar: url, user });
});
