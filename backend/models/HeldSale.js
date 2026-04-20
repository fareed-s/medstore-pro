const mongoose = require('mongoose');

const heldItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: String,
  genericName: String,
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  batchNumber: String,
  expiryDate: Date,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
  schedule: String,
}, { _id: true });

const heldSaleSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  items: [heldItemSchema],
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cashierName: String,
  notes: String,
  subtotal: { type: Number, default: 0 },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
}, {
  timestamps: true,
});

heldSaleSchema.index({ storeId: 1, expiresAt: 1 });

module.exports = mongoose.model('HeldSale', heldSaleSchema);
