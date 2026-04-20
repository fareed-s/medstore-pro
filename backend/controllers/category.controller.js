const Category = require('../models/Category');
const Medicine = require('../models/Medicine');
const { asyncHandler } = require('../utils/errorHandler');
const slugify = require('slugify');

exports.getCategories = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const categories = await Category.find({ storeId, isActive: true })
    .populate('parentCategory', 'name')
    .sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: categories });
});

exports.getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const productCount = await Medicine.countDocuments({ storeId: category.storeId, categoryId: category._id, isActive: true });
  res.json({ success: true, data: { ...category.toObject(), productCount } });
});

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

exports.updateCategory = asyncHandler(async (req, res) => {
  let category = await Category.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const { name, description, parentCategory, sortOrder, isActive } = req.body;
  if (name) category.name = name;
  if (name) category.slug = slugify(name, { lower: true });
  if (description !== undefined) category.description = description;
  if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();
  res.json({ success: true, data: category });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  // Check if products exist
  const count = await Medicine.countDocuments({ categoryId: category._id, isActive: true });
  if (count > 0) {
    return res.status(400).json({ success: false, message: `Cannot delete: ${count} products in this category` });
  }

  category.isActive = false;
  await category.save();
  res.json({ success: true, message: 'Category deleted' });
});
