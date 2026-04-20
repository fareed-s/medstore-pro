const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  plan: { type: String, enum: ['Free Trial', 'Basic', 'Standard', 'Premium'], required: true },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  maxProducts: Number,
  maxStaff: Number,
  amount: Number,
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  paymentMethod: String,
  paymentReference: String,
}, {
  timestamps: true,
});

subscriptionSchema.index({ storeId: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
