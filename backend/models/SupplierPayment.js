const mongoose = require('mongoose');

const supplierPaymentSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName: String,
  amount: { type: Number, required: true, min: 0 },
  method: {
    type: String,
    enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'other'],
    default: 'cash',
  },
  reference: String,
  chequeNumber: String,
  chequeDate: Date,
  bankName: String,
  poId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  grnId: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },
  notes: String,
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['completed', 'pending', 'bounced', 'cancelled'], default: 'completed' },
}, {
  timestamps: true,
});

supplierPaymentSchema.index({ storeId: 1, supplierId: 1 });
supplierPaymentSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('SupplierPayment', supplierPaymentSchema);
