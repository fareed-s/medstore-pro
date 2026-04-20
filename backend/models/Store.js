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
    enum: ['Free Trial', 'Basic', 'Standard', 'Premium'],
    default: 'Free Trial',
  },
  planStartDate: { type: Date, default: Date.now },
  planEndDate: Date,
  maxProducts: { type: Number, default: 100 },
  maxStaff: { type: Number, default: 2 },

  // Status
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
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

module.exports = mongoose.model('Store', storeSchema);
