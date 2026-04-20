const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },

  // Core Identity
  medicineName: { type: String, required: true, trim: true },
  genericName: { type: String, trim: true, index: true },
  manufacturer: { type: String, trim: true },
  barcode: { type: String, trim: true },
  sku: { type: String, trim: true },
  images: [String],

  // Classification
  category: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream/Ointment', 'Drops', 'Inhaler', 'Suppository', 'Sachet', 'Powder', 'Surgical', 'Device', 'Cosmetic', 'OTC', 'Baby Care', 'Nutrition', 'Gel', 'Lotion', 'Solution', 'Suspension', 'Spray', 'Patch', 'Strip'],
    default: 'Tablet',
  },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  subCategory: String,
  therapeuticClass: String,
  schedule: {
    type: String,
    enum: ['OTC', 'Schedule-G', 'Schedule-H', 'Schedule-H1', 'Schedule-X'],
    default: 'OTC',
  },
  isControlled: { type: Boolean, default: false },
  requiresPrescription: { type: Boolean, default: false },

  // Packaging & Dosage
  formulation: String,
  packSize: { type: String, default: '1' },
  unitsPerPack: { type: Number, default: 1 },
  unitOfMeasure: {
    type: String,
    enum: ['tablet', 'capsule', 'ml', 'mg', 'g', 'piece', 'strip', 'bottle', 'tube', 'vial', 'ampoule', 'sachet', 'pack'],
    default: 'tablet',
  },
  strength: String,
  dosageForm: {
    type: String,
    enum: ['Oral', 'Topical', 'Injectable', 'Ophthalmic', 'Otic', 'Nasal', 'Rectal', 'Inhalation', 'Sublingual', 'Transdermal'],
    default: 'Oral',
  },

  // Pricing
  costPrice: { type: Number, default: 0, min: 0 },
  mrp: { type: Number, default: 0, min: 0 },
  salePrice: { type: Number, default: 0, min: 0 },
  wholesalePrice: { type: Number, default: 0, min: 0 },
  marginPercent: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  hsnCode: String,
  isDiscountAllowed: { type: Boolean, default: true },

  // Inventory
  currentStock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  reorderLevel: { type: Number, default: 20 },
  reorderQuantity: { type: Number, default: 50 },
  rackLocation: String,
  storageCondition: {
    type: String,
    enum: ['Room Temperature', 'Refrigerate (2-8°C)', 'Freeze', 'Protect from Light', 'Cool & Dry Place'],
    default: 'Room Temperature',
  },
  isStockTracked: { type: Boolean, default: true },

  // Regulatory
  drugLicenseRequired: { type: Boolean, default: false },
  drapRegistrationNo: String,
  narcoticLicenseRequired: { type: Boolean, default: false },
  maxQuantityPerSale: Number,
  substituteProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' }],

  // Status
  isActive: { type: Boolean, default: true },
  isDiscontinued: { type: Boolean, default: false },
  isReturnable: { type: Boolean, default: true },

  // Meta
  description: String,
  sideEffects: String,
  contraindications: String,
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

// Indexes for fast search
medicineSchema.index({ storeId: 1, medicineName: 'text', genericName: 'text', manufacturer: 'text' });
medicineSchema.index({ storeId: 1, barcode: 1 });
medicineSchema.index({ storeId: 1, category: 1 });
medicineSchema.index({ storeId: 1, isActive: 1 });
medicineSchema.index({ storeId: 1, currentStock: 1 });
medicineSchema.index({ storeId: 1, schedule: 1 });

// Auto-calculate margin
medicineSchema.pre('save', function (next) {
  if (this.salePrice && this.costPrice && this.costPrice > 0) {
    this.marginPercent = parseFloat((((this.salePrice - this.costPrice) / this.costPrice) * 100).toFixed(2));
  }
  // Auto-set prescription requirement based on schedule
  if (['Schedule-H', 'Schedule-H1', 'Schedule-X'].includes(this.schedule)) {
    this.requiresPrescription = true;
  }
  if (this.schedule === 'Schedule-X') {
    this.isControlled = true;
    this.narcoticLicenseRequired = true;
  }
  next();
});

module.exports = mongoose.model('Medicine', medicineSchema);
