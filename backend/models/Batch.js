const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNumber: { type: String, required: true, trim: true },
  expiryDate: { type: Date, required: true },
  manufacturingDate: Date,
  quantity: { type: Number, required: true, min: 0 },
  remainingQty: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  grnId: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  isExpired: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  notes: String,
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

batchSchema.index({ storeId: 1, medicineId: 1, expiryDate: 1 });
batchSchema.index({ storeId: 1, batchNumber: 1 });
batchSchema.index({ storeId: 1, expiryDate: 1, remainingQty: 1 });
batchSchema.index({ storeId: 1, isExpired: 1 });
// FEFO selection inside POS sale: storeId + medicineId + isExpired + remainingQty
// is the exact filter shape — adding it covers the hot path on every cart line.
batchSchema.index({ storeId: 1, medicineId: 1, isExpired: 1, remainingQty: 1, expiryDate: 1 });
// Expiry dashboard groups by (storeId, isExpired, remainingQty) before slicing dates.
batchSchema.index({ storeId: 1, isExpired: 1, remainingQty: 1 });

// Check if expired
batchSchema.pre('save', function (next) {
  if (this.expiryDate && new Date(this.expiryDate) < new Date()) {
    this.isExpired = true;
  }
  next();
});

module.exports = mongoose.model('Batch', batchSchema);
