const Store = require('../models/Store');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const { asyncHandler } = require('../utils/errorHandler');

// @desc    Global platform stats
exports.getGlobalStats = asyncHandler(async (req, res) => {
  const [totalStores, activeStores, pendingApproval, totalUsers, totalProducts] = await Promise.all([
    Store.countDocuments(),
    Store.countDocuments({ isActive: true, isApproved: true }),
    Store.countDocuments({ isApproved: false }),
    User.countDocuments({ role: { $ne: 'SuperAdmin' } }),
    Medicine.countDocuments(),
  ]);

  const storesByPlan = await Store.aggregate([
    { $group: { _id: '$plan', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: { totalStores, activeStores, pendingApproval, totalUsers, totalProducts, storesByPlan },
  });
});

// @desc    List all stores
exports.getStores = asyncHandler(async (req, res) => {
  const { status, plan, search, page = 1, limit = 25 } = req.query;
  const filter = {};

  if (status === 'active') { filter.isActive = true; filter.isApproved = true; }
  if (status === 'pending') filter.isApproved = false;
  if (status === 'inactive') filter.isActive = false;
  if (plan) filter.plan = plan;
  if (search) {
    filter.$or = [
      { storeName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { ownerName: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Store.countDocuments(filter);
  const stores = await Store.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ success: true, data: stores, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

// @desc    Approve store
exports.approveStore = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  store.isApproved = true;
  store.approvedBy = req.user._id;
  store.approvedAt = new Date();
  await store.save();

  res.json({ success: true, data: store });
});

// @desc    Toggle store active status (suspend)
exports.toggleStore = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
  store.isActive = !store.isActive;
  await store.save();
  res.json({ success: true, data: store });
});

// @desc    Suspend store
exports.suspendStore = asyncHandler(async (req, res) => {
  const store = await Store.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
  res.json({ success: true, data: store });
});

// @desc    List all users across all stores
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, search, limit = 200 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  const users = await User.find(filter).populate('storeId', 'storeName').select('-password').sort({ createdAt: -1 }).limit(parseInt(limit));
  res.json({ success: true, data: users });
});

// @desc    Update user (activate/deactivate)
exports.updateUser = asyncHandler(async (req, res) => {
  const { isActive, role } = req.body;
  const updates = {};
  if (typeof isActive === 'boolean') updates.isActive = isActive;
  if (role) updates.role = role;
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user });
});

// @desc    Update store plan
exports.updatePlan = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  const plans = {
    'Free Trial': { maxProducts: 100, maxStaff: 2 },
    'Starter': { maxProducts: 500, maxStaff: 3 },
    'Professional': { maxProducts: 5000, maxStaff: 10 },
    'Premium': { maxProducts: Infinity, maxStaff: Infinity },
    'Enterprise': { maxProducts: Infinity, maxStaff: Infinity },
  };

  const cfg = plans[plan];
  if (cfg) {
    store.plan = plan;
    store.maxProducts = cfg.maxProducts;
    store.maxStaff = cfg.maxStaff;
    store.planStartDate = new Date();
    store.planEndDate = plan === 'Free Trial' ? new Date(Date.now() + 14 * 86400000) : new Date(Date.now() + 365 * 86400000);
    await store.save();
  }

  res.json({ success: true, data: store });
});
