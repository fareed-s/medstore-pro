const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { defaultPermissionsFor } = require('../config/modules');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  phone: { type: String },
  avatar: String,

  role: {
    type: String,
    enum: ['SuperAdmin', 'StoreAdmin', 'Pharmacist', 'Cashier', 'InventoryStaff'],
    default: 'Cashier',
  },

  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },

  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,

  // Per-module permission matrix: { moduleKey: { view, add, edit, delete } }
  modulePermissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Legacy flag-style permissions kept for back-compat with code paths that still read them.
  permissions: {
    canProcessReturns: { type: Boolean, default: false },
    canViewCostPrice: { type: Boolean, default: false },
    canManagePurchases: { type: Boolean, default: false },
    canManageCustomers: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    maxDiscountPercent: { type: Number, default: 0 },
  },

  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, {
  timestamps: true,
});

userSchema.index({ email: 1, storeId: 1 }, { unique: true });
userSchema.index({ storeId: 1, role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, storeId: this.storeId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Reset both legacy flags and module matrix to the role's defaults.
userSchema.methods.setDefaultPermissions = function () {
  const legacyMap = {
    SuperAdmin:     { canProcessReturns: true,  canViewCostPrice: true,  canManagePurchases: true,  canManageCustomers: true,  canViewReports: true,  maxDiscountPercent: 100 },
    StoreAdmin:     { canProcessReturns: true,  canViewCostPrice: true,  canManagePurchases: true,  canManageCustomers: true,  canViewReports: true,  maxDiscountPercent: 100 },
    Pharmacist:     { canProcessReturns: true,  canViewCostPrice: false, canManagePurchases: false, canManageCustomers: true,  canViewReports: false, maxDiscountPercent: 15 },
    Cashier:        { canProcessReturns: false, canViewCostPrice: false, canManagePurchases: false, canManageCustomers: false, canViewReports: false, maxDiscountPercent: 10 },
    InventoryStaff: { canProcessReturns: false, canViewCostPrice: false, canManagePurchases: false, canManageCustomers: false, canViewReports: false, maxDiscountPercent: 0 },
  };
  this.permissions = legacyMap[this.role] || legacyMap.Cashier;
  this.modulePermissions = defaultPermissionsFor(this.role);
  this.markModified('modulePermissions');
};

// Permission check honoring SuperAdmin/StoreAdmin override and module matrix.
userSchema.methods.can = function (moduleKey, action = 'view') {
  if (this.role === 'SuperAdmin' || this.role === 'StoreAdmin') return true;
  const m = this.modulePermissions?.[moduleKey];
  return !!(m && m[action]);
};

module.exports = mongoose.model('User', userSchema);
