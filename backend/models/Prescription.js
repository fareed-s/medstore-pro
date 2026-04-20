const mongoose = require('mongoose');

const prescriptionMedicineSchema = new mongoose.Schema({
  medicineName: String,
  genericName: String,
  dosage: String,
  frequency: String,
  duration: String,
  quantity: Number,
  dispensed: { type: Boolean, default: false },
  dispensedQty: { type: Number, default: 0 },
  dispensedDate: Date,
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
}, { _id: true });

const prescriptionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: String,

  doctorName: { type: String, required: true },
  doctorRegistration: String,
  doctorSpecialty: String,
  clinicName: String,
  clinicPhone: String,

  prescriptionDate: { type: Date, default: Date.now },
  expiryDate: Date, // Usually 6 months from prescription date
  images: [String], // Uploaded prescription images

  medicines: [prescriptionMedicineSchema],

  isDispensed: { type: Boolean, default: false },
  isPartiallyDispensed: { type: Boolean, default: false },
  dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispensedAt: Date,

  diagnosis: String,
  notes: String,
  status: { type: String, enum: ['active', 'dispensed', 'partial', 'expired', 'cancelled'], default: 'active' },

  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

prescriptionSchema.index({ storeId: 1, customerId: 1 });
prescriptionSchema.index({ storeId: 1, status: 1 });
prescriptionSchema.index({ storeId: 1, doctorName: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
