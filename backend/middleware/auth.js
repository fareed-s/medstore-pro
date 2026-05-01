const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Store = require('../models/Store');
const { isExpired } = require('../utils/plans');

// Tiny in-memory cache of (userId → user) and (storeId → store). Auth runs on
// every request; with 15 active users that's hundreds of identical lookups
// per minute. A 30-second TTL is short enough that role/permission/plan
// changes reflect quickly without cache busting.
const TTL_MS = 30 * 1000;
const userCache = new Map();   // id → { user, exp }
const storeCache = new Map();  // id → { store, exp }

const cacheGet = (cache, id) => {
  const hit = cache.get(String(id));
  if (!hit) return null;
  if (hit.exp < Date.now()) { cache.delete(String(id)); return null; }
  return hit.value;
};
const cachePut = (cache, id, value) => cache.set(String(id), { value, exp: Date.now() + TTL_MS });

// Exported so other modules can punch holes in the cache after a write
// (e.g. SuperAdmin suspends/reactivates a store, user changes their password).
exports.invalidateUserCache = (id) => userCache.delete(String(id));
exports.invalidateStoreCache = (id) => storeCache.delete(String(id));

// Verify JWT, attach req.user (and req.store for tenant users)
exports.protect = async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. Please login.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = cacheGet(userCache, decoded.id);
    if (!user) {
      user = await User.findById(decoded.id);
      if (user) cachePut(userCache, decoded.id, user);
    }
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated' });

    req.user = user;

    if (user.role !== 'SuperAdmin' && user.storeId) {
      let store = cacheGet(storeCache, user.storeId);
      if (!store) {
        store = await Store.findById(user.storeId);
        if (store) cachePut(storeCache, user.storeId, store);
      }
      if (!store) return res.status(403).json({ success: false, message: 'Store not found' });
      if (!store.isApproved) {
        return res.status(403).json({ success: false, message: 'Store pending approval' });
      }
      // Auto-suspend if the plan expired (lazy fallback in case the cron missed it).
      if (store.isActive && isExpired(store.planEndDate)) {
        store.isActive = false;
        store.suspendedReason = 'Plan expired';
        store.suspendedAt = new Date();
        await store.save();
        exports.invalidateStoreCache(store._id);
      }
      if (!store.isActive) {
        return res.status(403).json({
          success: false,
          message: store.suspendedReason || 'Store is suspended',
          code: 'STORE_SUSPENDED',
        });
      }
      req.store = store;
    }

    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token expired or invalid' });
  }
};

// Restrict by role (e.g. authorize('SuperAdmin','StoreAdmin'))
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' is not authorized for this action`,
    });
  }
  next();
};

// Tenant filter — SuperAdmin can scope by ?storeId, others are pinned to their store.
exports.tenantFilter = (req, res, next) => {
  if (req.user.role === 'SuperAdmin') {
    req.tenantFilter = req.query.storeId ? { storeId: req.query.storeId } : {};
  } else {
    req.tenantFilter = { storeId: req.user.storeId };
  }
  next();
};

// Legacy permission flag check (kept for old call sites)
exports.checkPermission = (permission) => (req, res, next) => {
  if (req.user.role === 'SuperAdmin' || req.user.role === 'StoreAdmin') return next();
  if (req.user.permissions && req.user.permissions[permission]) return next();
  return res.status(403).json({
    success: false,
    message: `You don't have permission: ${permission}`,
  });
};

// New: check the per-module matrix.
// Usage: requirePermission('medicines', 'add')
exports.requirePermission = (moduleKey, action = 'view') => (req, res, next) => {
  if (req.user.can(moduleKey, action)) return next();
  return res.status(403).json({
    success: false,
    message: `You don't have permission: ${action} on ${moduleKey}`,
  });
};

// Hide cost prices from Cashier
exports.hideCostPrice = (req, res, next) => {
  if (req.user.role === 'Cashier') req.hideCost = true;
  next();
};
