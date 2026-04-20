const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  batchNumber: String,
  movementType: {
    type: String,
    enum: ['purchase', 'sale', 'return_in', 'return_out', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out', 'expired', 'damaged', 'opening'],
    required: true,
  },
  quantity: { type: Number, required: true },
  direction: { type: String, enum: ['in', 'out'], required: true },
  balanceBefore: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  unitCost: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  referenceType: { type: String }, // Sale, PurchaseOrder, StockAdjustment, StockTransfer
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceNo: String,
  notes: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

stockMovementSchema.index({ storeId: 1, medicineId: 1, createdAt: -1 });
stockMovementSchema.index({ storeId: 1, movementType: 1 });
stockMovementSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
