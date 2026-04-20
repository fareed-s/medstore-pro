const mongoose = require('mongoose');

const customerPaymentSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: String,
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['cash', 'card', 'upi', 'bank_transfer', 'other'], default: 'cash' },
  reference: String,
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  notes: String,
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

customerPaymentSchema.index({ storeId: 1, customerId: 1, createdAt: -1 });

module.exports = mongoose.model('CustomerPayment', customerPaymentSchema);
