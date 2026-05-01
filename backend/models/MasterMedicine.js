const mongoose = require('mongoose');

// Single source of truth for the SuperAdmin-managed catalog. Stores that the
// SuperAdmin grants catalog access to receive copies of these into their own
// Medicine collection (with currentStock = 0). Has the same shape as Medicine
// minus the per-store fields (storeId, currentStock, addedBy, categoryId).

const masterMedicineSchema = new mongoose.Schema({
  // Core Identity
  medicineName: { type: String, required: true, trim: true },
  genericName: { type: String, trim: true, index: true },
  manufacturer: { type: String, trim: true },
  barcode: { type: String, trim: true },
  sku: { type: String, trim: true },

  // Classification
  category: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream/Ointment', 'Drops', 'Inhaler', 'Suppository', 'Sachet', 'Powder', 'Surgical', 'Device', 'Cosmetic', 'OTC', 'Baby Care', 'Nutrition', 'Gel', 'Lotion', 'Solution', 'Suspension', 'Spray', 'Patch', 'Strip'],
    default: 'Tablet',
  },
  subCategory: String,
  therapeuticClass: String,
  schedule: {
    type: String,
    enum: ['OTC', 'Schedule-G', 'Schedule-H', 'Schedule-H1', 'Schedule-X'],
    default: 'OTC',
  },

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

  // Pricing (defaults a store can override later)
  costPrice: { type: Number, default: 0, min: 0 },
  mrp: { type: Number, default: 0, min: 0 },
  salePrice: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0 },

  // Inventory hints copied to per-store records on sync
  lowStockThreshold: { type: Number, default: 10 },
  reorderLevel: { type: Number, default: 20 },
  reorderQuantity: { type: Number, default: 50 },
  storageCondition: {
    type: String,
    enum: ['Room Temperature', 'Refrigerate (2-8°C)', 'Freeze', 'Protect from Light', 'Cool & Dry Place'],
    default: 'Room Temperature',
  },

  description: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Case-insensitive uniqueness on medicineName so the catalog has one row per drug.
masterMedicineSchema.index({ medicineName: 1 }, {
  unique: true,
  collation: { locale: 'en', strength: 2 },
});

module.exports = mongoose.model('MasterMedicine', masterMedicineSchema);
