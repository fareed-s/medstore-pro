const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: String,
  genericName: String,
  quantity: { type: Number, required: true, min: 1 },
  receivedQty: { type: Number, default: 0 },
  freeQty: { type: Number, default: 0 },
  unitCost: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
  notes: String,
}, { _id: true });

const purchaseOrderSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  poNumber: { type: String, required: true, unique: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName: String,

  items: [poItemSchema],

  subtotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['draft', 'sent', 'partial', 'received', 'cancelled'],
    default: 'draft',
  },

  expectedDelivery: Date,
  notes: String,
  termsAndConditions: String,

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  sentAt: Date,
  cancelledAt: Date,
  cancelReason: String,
}, {
  timestamps: true,
});

purchaseOrderSchema.index({ storeId: 1, poNumber: 1 });
purchaseOrderSchema.index({ storeId: 1, supplierId: 1 });
purchaseOrderSchema.index({ storeId: 1, status: 1 });
purchaseOrderSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
