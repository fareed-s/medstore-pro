const mongoose = require('mongoose');
const Category = require('../models/Category');
const Medicine = require('../models/Medicine');
const { asyncHandler } = require('../utils/errorHandler');
const slugify = require('slugify');

// Map medicine.category enum → Category.name created by the seed.
// Used both for the "smart count" fallback and the backfill action.
const ENUM_TO_CATEGORY_NAME = {
  Tablet: 'Tablets',
  Capsule: 'Capsules',
  Syrup: 'Syrups & Suspensions',
  Suspension: 'Syrups & Suspensions',
  Injection: 'Injections',
  'Cream/Ointment': 'Creams & Ointments',
  Drops: 'Eye/Ear Drops',
  Inhaler: 'Inhalers',
  Spray: 'Sprays',
  Suppository: 'Suppositories',
  Sachet: 'Sachets & Powders',
  Powder: 'Sachets & Powders',
  Surgical: 'Surgical Items',
  Solution: 'Surgical Items',
  Device: 'Medical Devices',
  Patch: 'Medical Devices',
  Cosmetic: 'Cosmetics & Skin Care',
  OTC: 'OTC Medicines',
  'Baby Care': 'Baby Care',
  Nutrition: 'Nutrition & Supplements',
  Gel: 'Gels & Lotions',
  Lotion: 'Gels & Lotions',
  Strip: 'Tablets',
};

const oid = (v) => new mongoose.Types.ObjectId(String(v));

// GET /api/categories — list with productCount (categoryId match + enum fallback)
exports.getCategories = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const categories = await Category.find({ storeId, isActive: true })
    .populate('parentCategory', 'name')
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  // 1) Direct count by categoryId
  const directCounts = await Medicine.aggregate([
    { $match: { storeId: oid(storeId), isActive: true, categoryId: { $ne: null } } },
    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
  ]);
  const directMap = new Map(directCounts.map((c) => [String(c._id), c.count]));

  // 2) Fallback count by legacy enum, only for medicines that don't have a categoryId yet
  const enumCounts = await Medicine.aggregate([
    {
      $match: {
        storeId: oid(storeId),
        isActive: true,
        $or: [{ categoryId: null }, { categoryId: { $exists: false } }],
      },
    },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const enumMap = new Map(enumCounts.map((c) => [c._id, c.count]));

  for (const cat of categories) {
    const direct = directMap.get(String(cat._id)) || 0;
    let fallback = 0;
    for (const [enumVal, name] of Object.entries(ENUM_TO_CATEGORY_NAME)) {
      if (name === cat.name) fallback += enumMap.get(enumVal) || 0;
    }
    cat.productCount = direct + fallback;
  }

  res.json({ success: true, data: categories });
});

// GET /api/categories/:id
exports.getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const productCount = await Medicine.countDocuments({
    storeId: category.storeId,
    categoryId: category._id,
    isActive: true,
  });
  res.json({ success: true, data: { ...category.toObject(), productCount } });
});

// POST /api/categories
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description, parentCategory } = req.body;
  const storeId = req.user.storeId;

  const existing = await Category.findOne({ storeId, name });
  if (existing) return res.status(400).json({ success: false, message: 'Category already exists' });

  const category = await Category.create({
    storeId,
    name,
    slug: slugify(name, { lower: true }),
    description,
    parentCategory: parentCategory || null,
  });

  res.status(201).json({ success: true, data: category });
});

// PUT /api/categories/:id
exports.updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const { name, description, parentCategory, sortOrder, isActive } = req.body;
  if (name) {
    category.name = name;
    category.slug = slugify(name, { lower: true });
  }
  if (description !== undefined) category.description = description;
  if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();
  res.json({ success: true, data: category });
});

// DELETE /api/categories/:id  — soft delete; refuses if products are linked
exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const count = await Medicine.countDocuments({ categoryId: category._id, isActive: true });
  if (count > 0) {
    return res.status(400).json({ success: false, message: `Cannot delete: ${count} products in this category` });
  }

  category.isActive = false;
  await category.save();
  res.json({ success: true, message: 'Category deleted' });
});

// POST /api/categories/sync-medicines
// Links existing medicines to their Category docs based on the enum→name map.
// Only updates rows that don't already have a categoryId. Auto-creates any
// missing standard categories first, so a fresh store with 0 categories
// works in one click.
exports.syncMedicineCategories = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;

  // Step 1 — make sure every category referenced by the enum map exists.
  const neededNames = [...new Set(Object.values(ENUM_TO_CATEGORY_NAME))];
  const existing = await Category.find({ storeId, name: { $in: neededNames } }).select('name').lean();
  const existingSet = new Set(existing.map((c) => c.name));
  const toCreate = neededNames
    .filter((n) => !existingSet.has(n))
    .map((name) => ({
      storeId,
      name,
      slug: slugify(name, { lower: true }),
      isActive: true,
    }));
  let created = 0;
  if (toCreate.length) {
    try {
      const inserted = await Category.insertMany(toCreate, { ordered: false });
      created = inserted.length;
    } catch (err) {
      created = err.insertedDocs?.length || 0;
    }
  }

  // Step 2 — load current categories, then link each enum to its Category id.
  const cats = await Category.find({ storeId, isActive: true }).select('name _id').lean();
  const byName = new Map(cats.map((c) => [c.name, c._id]));

  let updated = 0;
  const missingCategories = [];

  for (const [enumVal, catName] of Object.entries(ENUM_TO_CATEGORY_NAME)) {
    const catId = byName.get(catName);
    if (!catId) {
      missingCategories.push(catName);
      continue;
    }
    const r = await Medicine.updateMany(
      {
        storeId,
        isActive: true,
        category: enumVal,
        $or: [{ categoryId: null }, { categoryId: { $exists: false } }],
      },
      { $set: { categoryId: catId } }
    );
    updated += r.modifiedCount || 0;
  }

  res.json({
    success: true,
    message: created > 0
      ? `Created ${created} categor${created === 1 ? 'y' : 'ies'} and linked ${updated} medicines`
      : `Linked ${updated} medicines to their categories`,
    data: { updated, created, missingCategories: [...new Set(missingCategories)] },
  });
});
