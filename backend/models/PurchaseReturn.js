const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: String,
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  batchNumber: String,
  quantity: { type: Number, required: true },
  unitCost: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
  reason: String,
}, { _id: true });

const purchaseReturnSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  returnNo: { type: String, required: true, unique: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName: String,
  grnId: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },
  items: [returnItemSchema],
  totalAmount: { type: Number, required: true },
  reason: { type: String, required: true },
  debitNoteNo: String,
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: String,
}, {
  timestamps: true,
});

purchaseReturnSchema.index({ storeId: 1, supplierId: 1 });
purchaseReturnSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('PurchaseReturn', purchaseReturnSchema);
