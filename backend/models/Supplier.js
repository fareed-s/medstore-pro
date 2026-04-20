const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  supplierName: { type: String, required: true, trim: true },
  companyName: { type: String, trim: true },
  phone: { type: String, required: true },
  email: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'Pakistan' },
    postalCode: String,
  },
  gstNumber: String,
  drugLicenseNumber: String,
  dlExpiryDate: Date,
  paymentTerms: {
    type: String,
    enum: ['COD', 'Credit 15', 'Credit 30', 'Credit 60', 'Credit 90'],
    default: 'COD',
  },
  creditLimit: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 }, // How much we owe
  rating: { type: Number, min: 1, max: 5, default: 3 },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountTitle: String,
    branchCode: String,
  },
  contactPerson: String,
  contactPersonPhone: String,
  notes: String,
  isActive: { type: Boolean, default: true },
  totalPurchases: { type: Number, default: 0 },
  totalPayments: { type: Number, default: 0 },
}, {
  timestamps: true,
});

supplierSchema.index({ storeId: 1, supplierName: 1 });
supplierSchema.index({ storeId: 1, isActive: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
