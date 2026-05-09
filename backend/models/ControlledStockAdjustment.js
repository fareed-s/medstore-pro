const mongoose = require('mongoose');

// Immutable audit row for every controlled-medicine batch quantity change.
// In a regulated narcotic register, you cannot just silently change a stock
// number — every adjustment must record a reason and the operator.
//
// Pencil-edit on a batch is restricted to non-quantity fields (batch #,
// expiry, prices). Quantity moves through this collection only.

const REASONS = [
  'damage',           // breakage, contamination
  'expiry',           // expired stock written off
  'theft',            // loss / theft
  'data-correction',  // typo / data entry mistake
  'inventory-count',  // physical count vs. system mismatch
  'return-to-supplier',
  'dispensary-use',   // internal use (non-sale)
  'other',
];

const controlledStockAdjustmentSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },

  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'ControlledMedicine', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, required: true },

  // Snapshots — same reasoning as ControlledSale: batch / medicine names
  // can change after the fact, but the audit row must reflect what
  // existed at adjustment time.
  medicineName: { type: String, required: true },
  schedule: String,
  batchNumber: { type: String, required: true },

  previousQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true, min: 0 },
  delta: { type: Number, required: true },     // newQuantity - previousQuantity

  reason: { type: String, enum: REASONS, required: true },
  notes: String,

  adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adjustedByName: String,
  adjustedByRole: String,
}, {
  timestamps: true,
});

controlledStockAdjustmentSchema.index({ storeId: 1, createdAt: -1 });
controlledStockAdjustmentSchema.index({ storeId: 1, medicineId: 1, createdAt: -1 });

// Block any post-create mutation — adjustment rows are immutable.
controlledStockAdjustmentSchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error('Stock adjustments are immutable.'));
  next();
});
['updateOne', 'updateMany', 'findOneAndUpdate', 'findByIdAndUpdate'].forEach((op) => {
  controlledStockAdjustmentSchema.pre(op, function (next) {
    next(new Error('Stock adjustments are immutable.'));
  });
});

module.exports = mongoose.model('ControlledStockAdjustment', controlledStockAdjustmentSchema);
module.exports.REASONS = REASONS;
