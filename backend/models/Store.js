const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  storeName: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'Pakistan' },
    postalCode: String,
  },
  logo: String,
  drugLicenseNumber: { type: String },
  drugLicenseExpiry: Date,
  gstNumber: String,
  ownerName: { type: String, required: true },
  ownerPhone: String,
  ownerEmail: String,

  // Subscription
  plan: {
    type: String,
    enum: ['Trial', 'Monthly', '6-Month', 'Yearly'],
    default: 'Trial',
  },
  planStartDate: { type: Date, default: Date.now },
  planEndDate: Date,
  planPrice: { type: Number, default: 0 },          // Custom amount entered by SuperAdmin at create/change time
  trialDays: { type: Number, default: 7 },          // Used only when plan === 'Trial'
  maxProducts: { type: Number, default: 100000 },
  maxStaff: { type: Number, default: 100 },

  // Status
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  suspendedReason: { type: String },                // 'Plan expired' | 'Manually suspended' | custom
  suspendedAt: Date,

  // SuperAdmin-controlled gate. When true the master catalog is auto-synced
  // to this store's Medicine collection (stock = 0). Default off — admins
  // opt stores in explicitly.
  hasMasterCatalog: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,

  // Settings
  settings: {
    currency: { type: String, default: 'PKR' },
    currencySymbol: { type: String, default: 'Rs.' },
    taxInclusive: { type: Boolean, default: false },
    defaultTaxRate: { type: Number, default: 0 },
    lowStockAlertDays: { type: Number, default: 30 },
    expiryAlertDays: { type: Number, default: 90 },
    reorderLeadDays: { type: Number, default: 7 },
    allowNegativeStock: { type: Boolean, default: false },
    cashierDiscountLimit: { type: Number, default: 10 },
    requireCustomerForSale: { type: Boolean, default: false },
    defaultPaymentMethod: { type: String, default: 'cash' },
    receiptWidth: { type: String, enum: ['58mm', '80mm', 'A4'], default: '80mm' },
    receiptHeader: String,
    receiptFooter: { type: String, default: 'Thank you for your purchase!' },
    showLogoOnReceipt: { type: Boolean, default: true },
    showDLOnReceipt: { type: Boolean, default: true },
    showGSTOnReceipt: { type: Boolean, default: true },
    showBatchOnReceipt: { type: Boolean, default: true },
    showExpiryOnReceipt: { type: Boolean, default: false },
    showTaxBreakdown: { type: Boolean, default: true },
    seniorCitizenAge: { type: Number, default: 60 },
    seniorCitizenDiscount: { type: Number, default: 5 },
    employeeDiscount: { type: Number, default: 10 },
    darkMode: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
  },
}, {
  timestamps: true,
});

storeSchema.index({ email: 1 });
storeSchema.index({ slug: 1 });
storeSchema.index({ isApproved: 1, isActive: 1 });
// Daily plan-expiry cron + lazy auth-middleware suspend both filter on
// (isActive, planEndDate) — covering both fields keeps the scan tiny.
storeSchema.index({ isActive: 1, planEndDate: 1 });
storeSchema.index({ hasMasterCatalog: 1 });

module.exports = mongoose.model('Store', storeSchema);
