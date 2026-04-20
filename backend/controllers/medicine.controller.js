const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { generateBarcode, generateSKU, paginate, paginationResult, sanitizeSearch } = require('../utils/helpers');

// @desc    Get all medicines (with search, filter, pagination)
// @route   GET /api/medicines
exports.getMedicines = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25, search, category, schedule, stockStatus, sort = '-createdAt' } = req.query;
  const storeId = req.user.role === 'SuperAdmin' ? req.query.storeId : req.user.storeId;

  if (!storeId && req.user.role !== 'SuperAdmin') {
    return res.status(400).json({ success: false, message: 'Store ID required' });
  }

  const filter = { isActive: true };
  if (storeId) filter.storeId = storeId;

  // Search by name, generic, barcode, manufacturer
  if (search) {
    const s = sanitizeSearch(search);
    filter.$or = [
      { medicineName: { $regex: s, $options: 'i' } },
      { genericName: { $regex: s, $options: 'i' } },
      { barcode: { $regex: s, $options: 'i' } },
      { manufacturer: { $regex: s, $options: 'i' } },
      { sku: { $regex: s, $options: 'i' } },
    ];
  }

  if (category) filter.category = category;
  if (schedule) filter.schedule = schedule;

  // Stock status filter
  if (stockStatus === 'out') filter.currentStock = 0;
  if (stockStatus === 'low') filter.$expr = { $lte: ['$currentStock', '$lowStockThreshold'] };
  if (stockStatus === 'ok') filter.$expr = { $gt: ['$currentStock', '$lowStockThreshold'] };

  const { skip, limit: lim } = paginate(null, page, limit);
  const total = await Medicine.countDocuments(filter);
  
  let query = Medicine.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(lim)
    .populate('categoryId', 'name');

  // Hide cost prices from Cashier
  if (req.hideCost) {
    query = query.select('-costPrice -wholesalePrice -marginPercent');
  }

  const medicines = await query;

  res.json({
    success: true,
    data: medicines,
    pagination: paginationResult(total, page, lim),
  });
});

// @desc    Get single medicine
// @route   GET /api/medicines/:id
exports.getMedicine = asyncHandler(async (req, res) => {
  let query = Medicine.findOne({ _id: req.params.id, ...req.tenantFilter })
    .populate('categoryId', 'name')
    .populate('substituteProducts', 'medicineName genericName salePrice currentStock');

  if (req.hideCost) {
    query = query.select('-costPrice -wholesalePrice -marginPercent');
  }

  const medicine = await query;
  if (!medicine) {
    return res.status(404).json({ success: false, message: 'Medicine not found' });
  }

  // Get batches for this medicine
  const batches = await Batch.find({
    medicineId: medicine._id,
    storeId: medicine.storeId,
    remainingQty: { $gt: 0 },
    isExpired: false,
  }).sort({ expiryDate: 1 });

  res.json({ success: true, data: { ...medicine.toObject(), batches } });
});

// @desc    Create medicine
// @route   POST /api/medicines
exports.createMedicine = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const data = { ...req.body, storeId, addedBy: req.user._id };

  // Auto-generate barcode if not provided
  if (!data.barcode) {
    data.barcode = generateBarcode();
  }

  // Auto-generate SKU
  if (!data.sku) {
    const count = await Medicine.countDocuments({ storeId });
    data.sku = generateSKU(data.category, count + 1);
  }

  // Check duplicate barcode in same store
  if (data.barcode) {
    const existing = await Medicine.findOne({ storeId, barcode: data.barcode });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Barcode already exists in this store' });
    }
  }

  const medicine = await Medicine.create(data);

  await ActivityLog.create({
    storeId,
    userId: req.user._id,
    action: 'Medicine created',
    module: 'medicine',
    details: `Added medicine: ${medicine.medicineName}`,
    entityId: medicine._id,
    entityType: 'Medicine',
  });

  res.status(201).json({ success: true, data: medicine });
});

// @desc    Update medicine
// @route   PUT /api/medicines/:id
exports.updateMedicine = asyncHandler(async (req, res) => {
  let medicine = await Medicine.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!medicine) {
    return res.status(404).json({ success: false, message: 'Medicine not found' });
  }

  const oldValues = medicine.toObject();
  medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

  await ActivityLog.create({
    storeId: medicine.storeId,
    userId: req.user._id,
    action: 'Medicine updated',
    module: 'medicine',
    entityId: medicine._id,
    entityType: 'Medicine',
    oldValues: { costPrice: oldValues.costPrice, salePrice: oldValues.salePrice, mrp: oldValues.mrp },
    newValues: { costPrice: medicine.costPrice, salePrice: medicine.salePrice, mrp: medicine.mrp },
  });

  res.json({ success: true, data: medicine });
});

// @desc    Delete (soft) medicine
// @route   DELETE /api/medicines/:id
exports.deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!medicine) {
    return res.status(404).json({ success: false, message: 'Medicine not found' });
  }

  medicine.isActive = false;
  await medicine.save();

  res.json({ success: true, message: 'Medicine deleted' });
});

// @desc    Search medicines (fast POS search)
// @route   GET /api/medicines/search
exports.searchMedicines = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;
  const storeId = req.user.storeId;

  if (!q || q.length < 1) {
    return res.json({ success: true, data: [] });
  }

  const s = sanitizeSearch(q);
  let query = Medicine.find({
    storeId,
    isActive: true,
    $or: [
      { medicineName: { $regex: s, $options: 'i' } },
      { genericName: { $regex: s, $options: 'i' } },
      { barcode: s },
      { sku: { $regex: s, $options: 'i' } },
    ],
  })
    .select('medicineName genericName barcode category salePrice mrp currentStock rackLocation schedule packSize strength')
    .limit(parseInt(limit))
    .sort({ medicineName: 1 });

  if (req.hideCost) {
    query = query.select('-costPrice -wholesalePrice -marginPercent');
  }

  const medicines = await query;
  res.json({ success: true, data: medicines });
});

// @desc    Lookup by barcode
// @route   GET /api/medicines/barcode/:code
exports.getByBarcode = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOne({
    storeId: req.user.storeId,
    barcode: req.params.code,
    isActive: true,
  });

  if (!medicine) {
    return res.status(404).json({ success: false, message: 'No medicine found with this barcode' });
  }

  // Get FEFO batch
  const batch = await Batch.findOne({
    medicineId: medicine._id,
    storeId: medicine.storeId,
    remainingQty: { $gt: 0 },
    isExpired: false,
  }).sort({ expiryDate: 1 });

  res.json({ success: true, data: { ...medicine.toObject(), currentBatch: batch } });
});

// @desc    Get low stock medicines
// @route   GET /api/medicines/low-stock
exports.getLowStock = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const medicines = await Medicine.find({
    storeId,
    isActive: true,
    isStockTracked: true,
    $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
  }).sort({ currentStock: 1 });

  res.json({ success: true, data: medicines, count: medicines.length });
});

// @desc    Get expiring medicines
// @route   GET /api/medicines/expiring
exports.getExpiring = asyncHandler(async (req, res) => {
  const { days = 90 } = req.query;
  const storeId = req.user.storeId;
  const { addDays } = require('date-fns');

  const targetDate = addDays(new Date(), parseInt(days));

  const batches = await Batch.find({
    storeId,
    expiryDate: { $lte: targetDate, $gte: new Date() },
    remainingQty: { $gt: 0 },
    isExpired: false,
  })
    .populate('medicineId', 'medicineName genericName category salePrice rackLocation')
    .sort({ expiryDate: 1 });

  res.json({ success: true, data: batches, count: batches.length });
});

// @desc    Get medicine substitutes
// @route   GET /api/medicines/substitutes/:id
exports.getSubstitutes = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine || !medicine.genericName) {
    return res.json({ success: true, data: [] });
  }

  const substitutes = await Medicine.find({
    storeId: medicine.storeId,
    genericName: medicine.genericName,
    _id: { $ne: medicine._id },
    isActive: true,
    currentStock: { $gt: 0 },
  }).select('medicineName genericName manufacturer salePrice mrp currentStock');

  res.json({ success: true, data: substitutes });
});

// @desc    Bulk import medicines (CSV)
// @route   POST /api/medicines/bulk-import
exports.bulkImport = asyncHandler(async (req, res) => {
  const { medicines } = req.body;
  const storeId = req.user.storeId;

  if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ success: false, message: 'No medicines to import' });
  }

  let imported = 0;
  let errors = [];

  for (const med of medicines) {
    try {
      med.storeId = storeId;
      med.addedBy = req.user._id;
      if (!med.barcode) med.barcode = generateBarcode();
      await Medicine.create(med);
      imported++;
    } catch (err) {
      errors.push({ medicine: med.medicineName, error: err.message });
    }
  }

  res.json({ success: true, imported, errors, total: medicines.length });
});
