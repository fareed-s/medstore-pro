const { z } = require('zod');

// Generic validation middleware
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }
    next(error);
  }
};

// Auth Schemas
const registerStoreSchema = z.object({
  storeName: z.string().min(2, 'Store name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Valid phone required'),
  ownerName: z.string().min(2, 'Owner name required'),
  address: z.object({
    street: z.string().optional(),
    city: z.string().min(2, 'City required'),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

// Medicine Schema
const medicineSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name required'),
  genericName: z.string().optional(),
  manufacturer: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  schedule: z.enum(['OTC', 'Schedule-G', 'Schedule-H', 'Schedule-H1', 'Schedule-X']).optional(),
  formulation: z.string().optional(),
  packSize: z.string().optional(),
  unitsPerPack: z.number().min(1).optional(),
  strength: z.string().optional(),
  costPrice: z.number().min(0).optional(),
  mrp: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  wholesalePrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  rackLocation: z.string().optional(),
  storageCondition: z.string().optional(),
});

// Batch Schema
const batchSchema = z.object({
  medicineId: z.string().min(1, 'Medicine ID required'),
  batchNumber: z.string().min(1, 'Batch number required'),
  expiryDate: z.string().min(1, 'Expiry date required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  costPrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  mrp: z.number().min(0).optional(),
});

// Category Schema
const categorySchema = z.object({
  name: z.string().min(1, 'Category name required'),
  description: z.string().optional(),
  parentCategory: z.string().optional(),
});

// User Schema
const createUserSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['StoreAdmin', 'Pharmacist', 'Cashier', 'InventoryStaff']),
});

module.exports = {
  validate,
  registerStoreSchema,
  loginSchema,
  medicineSchema,
  batchSchema,
  categorySchema,
  createUserSchema,
};
