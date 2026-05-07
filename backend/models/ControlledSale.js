const mongoose = require('mongoose');

// Sales register for the hidden Controlled/Narcotic Drugs module.
// Completely separate from the main Sale collection — this is the legal
// "Form 4" / narcotic register that regulators inspect.
//
// Each sold line item snapshots the medicine + batch at sale time so a
// later edit to the catalog or batch can never alter historical sales.

const itemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'ControlledMedicine', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, required: true },

  // Frozen snapshots — the catalog/batch can change later, but a sale
  // record must reflect what was actually sold.
  medicineName: { type: String, required: true },
  genericName: String,
  schedule: { type: String, required: true },
  batchNumber: { type: String, required: true },
  expiryDate: Date,

  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0 },     // for profit reports later
  total: { type: Number, required: true, min: 0 },
}, { _id: true });

const controlledSaleSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },

  // Auto-generated, unique within store. Format: CN-YYMMDD-XXXX (random suffix).
  invoiceNo: { type: String, required: true },

  items: { type: [itemSchema], required: true, validate: (v) => v.length > 0 },

  // Patient details — REQUIRED for Schedule-H1 and Schedule-X by drug
  // regulations across most jurisdictions. The controller enforces this
  // dynamically based on the items in the cart.
  patient: {
    name: String,
    age: Number,
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    address: String,
    phone: String,
    cnic: String,
  },

  // Prescribing doctor — REQUIRED when patient is required.
  doctor: {
    name: String,
    registrationNumber: String,
    prescriptionDate: Date,
    prescriptionImage: String,    // /uploads/... path; phase-3 leaves this optional
  },

  // Pricing roll-up
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },

  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'mobile-wallet', 'credit'],
    default: 'cash',
  },
  amountPaid: { type: Number, default: 0 },
  changeReturned: { type: Number, default: 0 },

  notes: String,

  soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  soldByName: String,
  soldByRole: String,

  // Sales are immutable. Reversal/return goes through a separate flow
  // (Phase 4) — never edit this doc once written.
  isVoided: { type: Boolean, default: false },
  voidedAt: Date,
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  voidReason: String,
}, {
  timestamps: true,
});

controlledSaleSchema.index({ storeId: 1, createdAt: -1 });
controlledSaleSchema.index({ storeId: 1, invoiceNo: 1 }, { unique: true });
controlledSaleSchema.index({ storeId: 1, 'items.medicineId': 1 });
controlledSaleSchema.index({ storeId: 1, 'patient.name': 1 });

// Block `.save()` on existing docs unless we're voiding (the only allowed
// post-create mutation). Defends against accidental edits via the ORM.
controlledSaleSchema.pre('save', function (next) {
  if (this.isNew) return next();
  // Allow only the void-related fields to change after creation.
  const dirty = this.modifiedPaths();
  const allowed = new Set(['isVoided', 'voidedAt', 'voidedBy', 'voidReason']);
  if (dirty.some((p) => !allowed.has(p))) {
    return next(new Error('ControlledSale records are immutable except for void.'));
  }
  next();
});

module.exports = mongoose.model('ControlledSale', controlledSaleSchema);
