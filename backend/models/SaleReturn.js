const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: String,
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  batchNumber: String,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
  restockBatch: { type: Boolean, default: true },
}, { _id: true });

const saleReturnSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  invoiceNo: String,
  returnNo: { type: String, required: true, unique: true },
  items: [returnItemSchema],
  refundAmount: { type: Number, required: true },
  refundMethod: { type: String, enum: ['cash', 'credit_note', 'exchange', 'card_refund'], default: 'cash' },
  reason: { type: String, required: true },
  notes: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['completed', 'pending', 'rejected'], default: 'completed' },
}, {
  timestamps: true,
});

saleReturnSchema.index({ storeId: 1, saleId: 1 });
saleReturnSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('SaleReturn', saleReturnSchema);
