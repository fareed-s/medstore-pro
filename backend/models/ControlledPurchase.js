const mongoose = require('mongoose');

// Goods-receipt note for the hidden module. One purchase doc per supplier
// invoice — even though stock physically arrives as batches on individual
// medicines (those live on ControlledMedicine.batches), grouping them under
// a purchase record gives auditors a paper trail back to the supplier.

const itemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'ControlledMedicine', required: true },
  // Frozen snapshot — same reasoning as ControlledSale.
  medicineName: { type: String, required: true },
  schedule: String,

  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 1 },
  costPrice: { type: Number, required: true, min: 0 },
  mrp: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },

  // Pointer to the batch we created on the medicine doc — useful for "where
  // did this stock come from?" lookups in Phase 5+.
  createdBatchId: { type: mongoose.Schema.Types.ObjectId },

  total: { type: Number, required: true, min: 0 },
}, { _id: true });

const controlledPurchaseSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },

  // Internal GRN number, format: GRN-CN-YYMMDD-XXXX
  grnNumber: { type: String, required: true },
  // Supplier-side document number (typed in by the receiver).
  supplierInvoiceNo: { type: String, trim: true },
  supplierInvoiceDate: Date,

  supplierName: { type: String, required: true, trim: true },
  supplierLicenseNumber: String,
  supplierAddress: String,
  supplierPhone: String,

  items: { type: [itemSchema], required: true, validate: (v) => v.length > 0 },

  subtotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, min: 0 },

  notes: String,

  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receivedByName: String,
}, {
  timestamps: true,
});

controlledPurchaseSchema.index({ storeId: 1, createdAt: -1 });
controlledPurchaseSchema.index({ storeId: 1, grnNumber: 1 }, { unique: true });
controlledPurchaseSchema.index({ storeId: 1, supplierName: 1 });

// Purchase records are immutable post-create — same reasoning as sales.
controlledPurchaseSchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error('ControlledPurchase records are immutable.'));
  next();
});

module.exports = mongoose.model('ControlledPurchase', controlledPurchaseSchema);
