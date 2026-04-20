const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  genericName: String,
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  batchNumber: String,
  expiryDate: Date,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
  schedule: String,
  requiresPrescription: { type: Boolean, default: false },
}, { _id: true });

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['cash', 'card', 'upi', 'wallet', 'insurance', 'credit'], required: true },
  amount: { type: Number, required: true },
  reference: String,
  receivedAt: { type: Date, default: Date.now },
}, { _id: true });

const saleSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  invoiceNo: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, default: 'Walk-in Customer' },
  customerPhone: String,
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cashierName: String,
  pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  items: [saleItemSchema],

  subtotal: { type: Number, required: true },
  taxTotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  overallDiscount: { type: Number, default: 0 },
  overallDiscountPercent: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  roundOff: { type: Number, default: 0 },
  netTotal: { type: Number, required: true },

  payments: [paymentSchema],
  totalPaid: { type: Number, default: 0 },
  changeGiven: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },

  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  prescriptionImage: String,
  doctorName: String,
  doctorReg: String,
  patientName: String,
  patientAge: Number,

  status: {
    type: String,
    enum: ['completed', 'held', 'voided', 'returned', 'partial_return'],
    default: 'completed',
  },
  voidReason: String,
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  voidedAt: Date,

  notes: String,
  isControlledDrugSale: { type: Boolean, default: false },

  // Return tracking
  returnedAmount: { type: Number, default: 0 },
  hasReturns: { type: Boolean, default: false },
}, {
  timestamps: true,
});

saleSchema.index({ storeId: 1, invoiceNo: 1 });
saleSchema.index({ storeId: 1, createdAt: -1 });
saleSchema.index({ storeId: 1, status: 1 });
saleSchema.index({ storeId: 1, cashierId: 1 });
saleSchema.index({ storeId: 1, customerId: 1 });

module.exports = mongoose.model('Sale', saleSchema);
