const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  date: { type: Date, default: Date.now },
  category: {
    type: String,
    enum: ['Rent', 'Salaries', 'Electricity', 'Transport', 'Maintenance', 'Packaging', 'Marketing', 'License Fees', 'Insurance Premium', 'Telephone', 'Internet', 'Stationery', 'Cleaning', 'Miscellaneous'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'cheque', 'upi', 'other'], default: 'cash' },
  reference: String,
  receipt: String, // image path
  isRecurring: { type: Boolean, default: false },
  recurringFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

expenseSchema.index({ storeId: 1, date: -1 });
expenseSchema.index({ storeId: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
