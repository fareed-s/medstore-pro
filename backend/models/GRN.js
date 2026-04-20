const mongoose = require('mongoose');

const grnItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: String,
  orderedQty: { type: Number, default: 0 },
  receivedQty: { type: Number, required: true },
  freeQty: { type: Number, default: 0 },
  damagedQty: { type: Number, default: 0 },
  shortQty: { type: Number, default: 0 },
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  manufacturingDate: Date,
  unitCost: { type: Number, required: true },
  mrp: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }, // Created batch
  notes: String,
}, { _id: true });

const grnSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  grnNumber: { type: String, required: true, unique: true },
  poId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  poNumber: String,
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName: String,
  supplierInvoiceNo: String,
  supplierInvoiceDate: Date,

  items: [grnItemSchema],

  subtotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['draft', 'verified', 'completed'],
    default: 'completed',
  },

  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  notes: String,
}, {
  timestamps: true,
});

grnSchema.index({ storeId: 1, grnNumber: 1 });
grnSchema.index({ storeId: 1, supplierId: 1 });
grnSchema.index({ storeId: 1, poId: 1 });
grnSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('GRN', grnSchema);
