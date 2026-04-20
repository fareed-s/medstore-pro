const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: String,
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  batchNumber: String,
  expiryDate: Date,
  quantity: { type: Number, required: true, min: 1 },
  costPrice: { type: Number, default: 0 },
}, { _id: true });

const stockTransferSchema = new mongoose.Schema({
  transferNo: { type: String, required: true, unique: true },
  fromStoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  toStoreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  fromLocation: String,
  toLocation: String,
  items: [transferItemSchema],
  totalItems: { type: Number, default: 0 },
  totalQuantity: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'in_transit', 'received', 'cancelled'],
    default: 'draft',
  },
  notes: String,
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: Date,
  receivedAt: Date,
}, {
  timestamps: true,
});

stockTransferSchema.index({ fromStoreId: 1, status: 1 });
stockTransferSchema.index({ toStoreId: 1, status: 1 });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
