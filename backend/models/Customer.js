const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  customerName: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  email: String,
  address: { street: String, city: String, state: String, postalCode: String },
  dateOfBirth: Date,
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  cnic: String,

  customerType: {
    type: String,
    enum: ['walk-in', 'regular', 'chronic', 'wholesale', 'insurance', 'employee'],
    default: 'regular',
  },

  // Drug Safety (CRITICAL)
  allergies: [{ name: String, severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'moderate' }, notes: String }],
  currentMedications: [{ medicineName: String, genericName: String, dosage: String, prescribedBy: String, startDate: Date }],
  conditions: [{ name: String, diagnosedDate: Date, notes: String }], // diabetes, hypertension, etc

  // Insurance
  insuranceDetails: {
    company: String,
    policyNumber: String,
    planType: String,
    coPayPercent: { type: Number, default: 0 },
    maxCoverage: Number,
    usedCoverage: { type: Number, default: 0 },
    validUntil: Date,
  },

  // Credit / Udhar
  creditLimit: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 }, // How much customer owes
  creditBlocked: { type: Boolean, default: false },

  // Loyalty
  loyaltyPoints: { type: Number, default: 0 },
  totalPointsEarned: { type: Number, default: 0 },
  totalPointsRedeemed: { type: Number, default: 0 },
  loyaltyTier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], default: 'Bronze' },

  preferredPaymentMethod: { type: String, default: 'cash' },
  notes: String,
  isActive: { type: Boolean, default: true },

  // Stats
  totalPurchases: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  visitCount: { type: Number, default: 0 },
  lastVisit: Date,
}, {
  timestamps: true,
});

customerSchema.index({ storeId: 1, phone: 1 }, { unique: true });
customerSchema.index({ storeId: 1, customerName: 'text' });
customerSchema.index({ storeId: 1, customerType: 1 });

module.exports = mongoose.model('Customer', customerSchema);
