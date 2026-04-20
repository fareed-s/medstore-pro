const mongoose = require('mongoose');

const drugLicenseSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  type: {
    type: String,
    enum: ['store_retail', 'store_wholesale', 'store_restricted', 'supplier', 'narcotic'],
    required: true,
  },
  licenseNumber: { type: String, required: true },
  issuedTo: String, // Store name or supplier name
  issuedBy: String, // Authority name
  issueDate: Date,
  expiryDate: { type: Date, required: true },
  categories: [String], // Drug categories covered
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  
  // Renewal tracking
  renewalStatus: { type: String, enum: ['active', 'expiring_soon', 'expired', 'renewal_pending'], default: 'active' },
  renewalDate: Date,
  renewalReference: String,
  renewalNotes: String,

  documentImage: String,
  isActive: { type: Boolean, default: true },
  notes: String,
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

drugLicenseSchema.index({ storeId: 1, type: 1 });
drugLicenseSchema.index({ storeId: 1, expiryDate: 1 });

module.exports = mongoose.model('DrugLicense', drugLicenseSchema);
