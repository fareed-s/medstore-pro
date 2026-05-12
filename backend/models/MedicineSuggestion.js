const mongoose = require('mongoose');

// Pending-review queue for medicines that stores add manually and that don't
// yet exist in MasterMedicine. SuperAdmin reviews these → on approve, the
// document is copied into MasterMedicine (and optionally pushed to every
// catalog-enabled store); on reject, the row stays for audit but is hidden.
//
// Deduplication: medicineName has a case-insensitive unique index, so if
// Store A and Store B both add "Aspirin 500mg", only ONE suggestion row
// exists. We bump `contributedByStoreIds` + `contributorCount` instead of
// inserting a duplicate.

const medicineSuggestionSchema = new mongoose.Schema({
  // Same shape as MasterMedicine — easy to copy across on approve.
  medicineName:    { type: String, required: true, trim: true },
  genericName:     { type: String, trim: true },
  manufacturer:    { type: String, trim: true },
  barcode:         { type: String, trim: true },
  sku:             { type: String, trim: true },
  category:        { type: String, default: 'Tablet' },
  subCategory:     String,
  therapeuticClass: String,
  schedule:        { type: String, default: 'OTC' },
  formulation:     String,
  packSize:        { type: String, default: '1' },
  unitsPerPack:    { type: Number, default: 1 },
  unitOfMeasure:   { type: String, default: 'tablet' },
  strength:        String,
  dosageForm:      { type: String, default: 'Oral' },
  costPrice:       { type: Number, default: 0, min: 0 },
  mrp:             { type: Number, default: 0, min: 0 },
  salePrice:       { type: Number, default: 0, min: 0 },
  taxRate:         { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  reorderLevel:    { type: Number, default: 20 },
  reorderQuantity: { type: Number, default: 50 },
  storageCondition: { type: String, default: 'Room Temperature' },
  description:     String,

  // Suggestion-only fields
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  contributedByStoreIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store' }],
  contributorCount: { type: Number, default: 1 },
  firstContributedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:   Date,
  rejectionReason: String,
}, { timestamps: true });

// Same uniqueness rule as MasterMedicine — one row per drug name,
// case-insensitive. Two stores adding "aspirin" and "Aspirin" hit the
// same row and bump the contributor list instead of duplicating.
medicineSuggestionSchema.index({ medicineName: 1 }, {
  unique: true,
  collation: { locale: 'en', strength: 2 },
});

module.exports = mongoose.model('MedicineSuggestion', medicineSuggestionSchema);
