module.exports = {
  ROLES: {
    SUPER_ADMIN: 'SuperAdmin',
    STORE_ADMIN: 'StoreAdmin',
    PHARMACIST: 'Pharmacist',
    CASHIER: 'Cashier',
    INVENTORY_STAFF: 'InventoryStaff',
  },

  STORE_PLANS: {
    FREE_TRIAL: { name: 'Free Trial', maxProducts: 100, maxStaff: 2, price: 0, durationDays: 14 },
    BASIC: { name: 'Basic', maxProducts: 500, maxStaff: 3, price: 1500 },
    STANDARD: { name: 'Standard', maxProducts: 2000, maxStaff: 10, price: 3000 },
    PREMIUM: { name: 'Premium', maxProducts: Infinity, maxStaff: Infinity, price: 5000 },
  },

  MEDICINE_CATEGORIES: [
    'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream/Ointment', 'Drops',
    'Inhaler', 'Suppository', 'Sachet', 'Powder', 'Surgical', 'Device',
    'Cosmetic', 'OTC', 'Baby Care', 'Nutrition', 'Gel', 'Lotion',
    'Solution', 'Suspension', 'Spray', 'Patch', 'Strip',
  ],

  DRUG_SCHEDULES: ['OTC', 'Schedule-G', 'Schedule-H', 'Schedule-H1', 'Schedule-X'],

  DOSAGE_FORMS: ['Oral', 'Topical', 'Injectable', 'Ophthalmic', 'Otic', 'Nasal', 'Rectal', 'Inhalation', 'Sublingual', 'Transdermal'],

  STORAGE_CONDITIONS: ['Room Temperature', 'Refrigerate (2-8°C)', 'Freeze', 'Protect from Light', 'Cool & Dry Place'],

  UNITS_OF_MEASURE: ['tablet', 'capsule', 'ml', 'mg', 'g', 'piece', 'strip', 'bottle', 'tube', 'vial', 'ampoule', 'sachet', 'pack'],

  PAYMENT_METHODS: ['cash', 'card', 'upi', 'wallet', 'insurance', 'credit'],

  SALE_STATUS: ['completed', 'held', 'voided', 'returned'],

  PO_STATUS: ['draft', 'sent', 'partial', 'received', 'cancelled'],

  ADJUSTMENT_REASONS: ['Damaged', 'Expired', 'Lost', 'Breakage', 'Theft', 'Found', 'Count Correction'],

  TAX_RATES: [0, 5, 12, 18, 28],

  EXPIRY_ALERT_DAYS: { RED: 30, AMBER: 60, GREEN: 90 },
};
