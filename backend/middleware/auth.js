const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Store = require('../models/Store');

// Protect routes — verify JWT
exports.protect = async (req, res, next) => {
  let token;

  // Check cookie first, then Authorization header
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
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated' });
    }

    req.user = user;

    // Attach store info for non-SuperAdmin
    if (user.role !== 'SuperAdmin' && user.storeId) {
      const store = await Store.findById(user.storeId);
      if (!store || !store.isActive) {
        return res.status(403).json({ success: false, message: 'Store is inactive or not found' });
      }
      if (!store.isApproved) {
        return res.status(403).json({ success: false, message: 'Store pending approval' });
      }
      req.store = store;
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token expired or invalid' });
  }
};

// Authorize roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

// Ensure tenant isolation — filter by storeId
exports.tenantFilter = (req, res, next) => {
  if (req.user.role === 'SuperAdmin') {
    // SuperAdmin can optionally filter by storeId query param
    if (req.query.storeId) {
      req.tenantFilter = { storeId: req.query.storeId };
    } else {
      req.tenantFilter = {};
    }
  } else {
    req.tenantFilter = { storeId: req.user.storeId };
  }
  next();
};

// Check specific permission
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (req.user.role === 'SuperAdmin' || req.user.role === 'StoreAdmin') {
      return next();
    }
    if (req.user.permissions && req.user.permissions[permission]) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `You don't have permission: ${permission}`,
    });
  };
};

// Hide cost prices from Cashier
exports.hideCostPrice = (req, res, next) => {
  if (req.user.role === 'Cashier') {
    req.hideCost = true;
  }
  next();
};
