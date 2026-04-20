const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  doctorName: { type: String, required: true, trim: true },
  registration: String,
  specialty: String,
  clinicName: String,
  clinicAddress: String,
  phone: String,
  email: String,
  prescriptionCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

doctorSchema.index({ storeId: 1, doctorName: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
