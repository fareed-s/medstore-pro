const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  type: { type: String, enum: ['increase', 'decrease'], required: true },
  quantity: { type: Number, required: true },
  previousQty: { type: Number },
  newQty: { type: Number },
  reason: {
    type: String,
    enum: ['Damaged', 'Expired', 'Lost', 'Breakage', 'Theft', 'Found', 'Count Correction', 'Opening Stock', 'Other'],
    required: true,
  },
  notes: String,
  adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
}, {
  timestamps: true,
});

stockAdjustmentSchema.index({ storeId: 1, medicineId: 1 });
stockAdjustmentSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
