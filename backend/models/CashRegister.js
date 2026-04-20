const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['cash_in', 'cash_out'], required: true },
  category: String, // sale, payment_received, expense, supplier_payment, withdrawal, deposit
  amount: { type: Number, required: true },
  description: String,
  referenceType: String,
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceNo: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedAt: { type: Date, default: Date.now },
}, { _id: true });

const cashRegisterSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  date: { type: Date, required: true },
  openingBalance: { type: Number, required: true, default: 0 },
  closingBalance: { type: Number },
  expectedClosing: { type: Number },
  cashIn: { type: Number, default: 0 },
  cashOut: { type: Number, default: 0 },
  overage: { type: Number, default: 0 },
  shortage: { type: Number, default: 0 },
  transactions: [cashTransactionSchema],
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  openedAt: { type: Date, default: Date.now },
  closedAt: Date,
  notes: String,
}, { timestamps: true });

cashRegisterSchema.index({ storeId: 1, date: -1 });
cashRegisterSchema.index({ storeId: 1, status: 1 });

module.exports = mongoose.model('CashRegister', cashRegisterSchema);
