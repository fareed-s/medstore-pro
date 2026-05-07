const mongoose = require('mongoose');

// Catalog for the hidden Controlled/Narcotic Drugs module. INTENTIONALLY a
// separate collection from `Medicine` — these drugs must not appear in the
// regular POS, regular inventory, or regular reports.
//
// Batch tracking is mandatory by regulation for narcotic drugs (Schedule-H1,
// Schedule-X), so batches live inline on the document. Sales decrement a
// specific batch (FIFO by default, but the POS can pick manually). Keeping
// batches embedded keeps stock-update writes atomic without a transaction.

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true, trim: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 0 },
  // Frozen at the time of receiving — sale price can override per-batch.
  costPrice: { type: Number, default: 0, min: 0 },
  mrp: { type: Number, default: 0, min: 0 },
  salePrice: { type: Number, default: 0, min: 0 },
  // Manufacturer's batch source — supplier or "internal" for stock corrections.
  source: { type: String, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const controlledMedicineSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },

  medicineName: { type: String, required: true, trim: true },
  genericName: { type: String, trim: true },
  manufacturer: { type: String, trim: true },

  // Regulatory — Schedule-X is the most restrictive. Default H1 is a sane
  // pick because most narcotic prescription drugs fall there.
  schedule: {
    type: String,
    enum: ['Schedule-H', 'Schedule-H1', 'Schedule-X'],
    default: 'Schedule-H1',
    required: true,
  },
  narcoticLicenseNumber: { type: String, trim: true },

  category: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Solution', 'Drops', 'Patch', 'Other'],
    default: 'Tablet',
  },
  strength: String,
  unitOfMeasure: { type: String, default: 'tablet' },
  packSize: { type: String, default: '1' },

  // Default pricing — can be overridden per-batch. Stored separately so
  // the form can pre-fill new batches.
  defaultCostPrice: { type: Number, default: 0, min: 0 },
  defaultMrp: { type: Number, default: 0, min: 0 },
  defaultSalePrice: { type: Number, default: 0, min: 0 },

  // Sale rules — Schedule-X often capped to N units per Rx by local law.
  maxQuantityPerSale: { type: Number, default: 0 },        // 0 = no cap
  requiresPrescription: { type: Boolean, default: true },

  // Inventory
  batches: [batchSchema],
  // Cached sum so list pages don't have to aggregate. Recomputed on every
  // batch mutation by `recomputeStock()` below.
  currentStock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },

  storageCondition: {
    type: String,
    enum: ['Room Temperature', 'Refrigerate (2-8°C)', 'Freeze', 'Protect from Light'],
    default: 'Room Temperature',
  },

  notes: String,

  isActive: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

controlledMedicineSchema.index({ storeId: 1, medicineName: 'text', genericName: 'text' });
controlledMedicineSchema.index({ storeId: 1, schedule: 1 });
controlledMedicineSchema.index({ storeId: 1, isActive: 1 });

// Recompute stock from the embedded batches. Call after any batch mutation.
controlledMedicineSchema.methods.recomputeStock = function () {
  this.currentStock = (this.batches || []).reduce(
    (sum, b) => sum + (Number(b.quantity) || 0), 0
  );
};

controlledMedicineSchema.pre('save', function (next) {
  if (this.isModified('batches')) this.recomputeStock();
  next();
});

module.exports = mongoose.model('ControlledMedicine', controlledMedicineSchema);
