const mongoose = require('mongoose');

const countItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: String,
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  batchNumber: String,
  systemQty: { type: Number, required: true },
  physicalQty: { type: Number, required: true },
  variance: { type: Number, required: true },
  varianceValue: { type: Number, default: 0 },
  reason: String,
}, { _id: true });

const stockCountSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  countNo: { type: String, required: true },
  countDate: { type: Date, default: Date.now },
  category: String, // Optional — count specific category only
  rackLocation: String, // Optional — count specific rack
  items: [countItemSchema],
  totalItems: { type: Number, default: 0 },
  totalVariance: { type: Number, default: 0 },
  totalVarianceValue: { type: Number, default: 0 },
  positiveVariance: { type: Number, default: 0 }, // Found extra
  negativeVariance: { type: Number, default: 0 }, // Missing
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'approved', 'rejected'],
    default: 'in_progress',
  },
  countedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  notes: String,
}, {
  timestamps: true,
});

stockCountSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('StockCount', stockCountSchema);
