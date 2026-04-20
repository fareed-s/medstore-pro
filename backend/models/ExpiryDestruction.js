const mongoose = require('mongoose');

const destructionItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: String,
  genericName: String,
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  batchNumber: String,
  expiryDate: Date,
  quantity: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
}, { _id: true });

const expiryDestructionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  destructionNo: { type: String, required: true },
  date: { type: Date, default: Date.now },
  items: [destructionItemSchema],
  totalItems: { type: Number, default: 0 },
  totalQuantity: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  
  destructionMethod: {
    type: String,
    enum: ['incineration', 'chemical_treatment', 'landfill', 'return_to_manufacturer', 'other'],
    required: true,
  },
  destructionLocation: String,
  
  // Witnesses
  witness1Name: { type: String, required: true },
  witness1Designation: String,
  witness2Name: String,
  witness2Designation: String,

  // Authority
  inspectorName: String,
  inspectorId: String,
  
  certificateGenerated: { type: Boolean, default: false },
  certificateNo: String,
  
  conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft', 'completed', 'certified'], default: 'completed' },
  notes: String,
}, {
  timestamps: true,
});

expiryDestructionSchema.index({ storeId: 1, date: -1 });

module.exports = mongoose.model('ExpiryDestruction', expiryDestructionSchema);
