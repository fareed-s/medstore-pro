const mongoose = require('mongoose');

const controlledDrugRegisterSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: String,
  genericName: String,
  schedule: { type: String, enum: ['Schedule-H', 'Schedule-H1', 'Schedule-X'], required: true },
  
  // Transaction details
  transactionType: { type: String, enum: ['sale', 'purchase', 'return', 'destruction'], required: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  invoiceNo: String,
  grnId: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },

  // Patient details (mandatory for H1/X)
  patientName: { type: String },
  patientAge: Number,
  patientGender: String,
  patientAddress: String,
  patientPhone: String,
  patientCNIC: String,

  // Doctor details
  doctorName: String,
  doctorRegistration: String,
  prescriptionDate: Date,
  prescriptionImage: String,

  // Drug details
  batchNumber: String,
  quantity: { type: Number, required: true },
  direction: { type: String, enum: ['in', 'out'], required: true },
  balanceBefore: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  
  date: { type: Date, default: Date.now },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Immutability — once created cannot be edited (only admin can add correction)
  isCorrection: { type: Boolean, default: false },
  correctionOf: { type: mongoose.Schema.Types.ObjectId, ref: 'ControlledDrugRegister' },
  correctionReason: String,
  correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  notes: String,
}, {
  timestamps: true,
});

controlledDrugRegisterSchema.index({ storeId: 1, medicineId: 1, date: -1 });
controlledDrugRegisterSchema.index({ storeId: 1, schedule: 1 });
controlledDrugRegisterSchema.index({ storeId: 1, patientName: 1 });
controlledDrugRegisterSchema.index({ storeId: 1, date: -1 });

module.exports = mongoose.model('ControlledDrugRegister', controlledDrugRegisterSchema);
