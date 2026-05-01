const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Category = require('../models/Category');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { generateBarcode, generateSKU, paginate, paginationResult, sanitizeSearch } = require('../utils/helpers');

// After an aggregation pipeline we lose the populate() helpers, so re-attach
// the category name in one batched lookup.
const populateCategoryName = async (medicines) => {
  const ids = [...new Set(medicines.map((m) => m.categoryId).filter(Boolean).map(String))];
  if (!ids.length) return medicines;
  const cats = await Category.find({ _id: { $in: ids } }).select('name').lean();
  const byId = new Map(cats.map((c) => [String(c._id), { _id: c._id, name: c.name }]));
  return medicines.map((m) => ({
    ...m,
    categoryId: m.categoryId ? byId.get(String(m.categoryId)) || m.categoryId : m.categoryId,
  }));
};

// @desc    Get all medicines (with search, filter, pagination)
// @route   GET /api/medicines
exports.getMedicines = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25, search, category, categoryId, schedule, stockStatus, inStock, sort = '-createdAt' } = req.query;
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

  if (categoryId) filter.categoryId = categoryId;
  else if (category) filter.category = category;
  if (schedule) filter.schedule = schedule;

  // Stock status filter
  if (stockStatus === 'out') filter.currentStock = 0;
  if (stockStatus === 'low') filter.$expr = { $lte: ['$currentStock', '$lowStockThreshold'] };
  if (stockStatus === 'ok') filter.$expr = { $gt: ['$currentStock', '$lowStockThreshold'] };

  // POS uses inStock=true to hide out-of-stock items entirely
  if (inStock === 'true' || inStock === '1') filter.currentStock = { $gt: 0 };

  const { skip, limit: lim } = paginate(null, page, limit);
  const total = await Medicine.countDocuments(filter);

  let medicines;
  if (search) {
    // When the user is searching, rank prefix-matches above substring-matches
    // and sort alphabetically inside each rank. So typing "nov" surfaces
    // medicines that *start with* "Nov…" before ones that just contain it
    // (e.g. "Pregnovit"). Same for typing "n" — "Novosef" beats "Aspirin".
    const escaped = sanitizeSearch(search);
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          _rank: {
            $cond: [
              { $regexMatch: { input: '$medicineName', regex: `^${escaped}`, options: 'i' } },
              0,
              1,
            ],
          },
        },
      },
      { $sort: { _rank: 1, medicineName: 1 } },
      { $skip: skip },
      { $limit: lim },
    ];
    if (req.hideCost) {
      pipeline.push({ $project: { costPrice: 0, wholesalePrice: 0, marginPercent: 0, _rank: 0 } });
    } else {
      pipeline.push({ $project: { _rank: 0 } });
    }
    medicines = await Medicine.aggregate(pipeline);
    medicines = await populateCategoryName(medicines);
  } else {
    let query = Medicine.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(lim)
      .populate('categoryId', 'name');

    if (req.hideCost) {
      query = query.select('-costPrice -wholesalePrice -marginPercent');
    }
    medicines = await query;
  }

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

  // Get batches for this medicine. .lean() — display-only, no Mongoose hydration.
  const batches = await Batch.find({
    medicineId: medicine._id,
    storeId: medicine.storeId,
    remainingQty: { $gt: 0 },
    isExpired: false,
  }).sort({ expiryDate: 1 }).lean();

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

// @desc    Search medicines (fast POS search). Ranks prefix matches above
//          substring matches so typing "nov" surfaces medicines that start
//          with "Nov…" before ones that just contain it.
// @route   GET /api/medicines/search
exports.searchMedicines = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;
  const storeId = req.user.storeId;

  if (!q || q.length < 1) {
    return res.json({ success: true, data: [] });
  }

  const s = sanitizeSearch(q);
  const filter = {
    storeId,
    isActive: true,
    $or: [
      { medicineName: { $regex: s, $options: 'i' } },
      { genericName: { $regex: s, $options: 'i' } },
      { barcode: s },
      { sku: { $regex: s, $options: 'i' } },
    ],
  };
  if (req.query.inStock === 'true' || req.query.inStock === '1') {
    filter.currentStock = { $gt: 0 };
  }

  const projectFields = {
    medicineName: 1, genericName: 1, barcode: 1, category: 1, salePrice: 1,
    mrp: 1, currentStock: 1, rackLocation: 1, schedule: 1, packSize: 1, strength: 1,
    taxRate: 1,
    ...(req.hideCost ? {} : { costPrice: 1, wholesalePrice: 1, marginPercent: 1 }),
  };

  const medicines = await Medicine.aggregate([
    { $match: filter },
    {
      $addFields: {
        _rank: {
          $cond: [
            { $regexMatch: { input: '$medicineName', regex: `^${s}`, options: 'i' } },
            0,
            1,
          ],
        },
      },
    },
    { $sort: { _rank: 1, medicineName: 1 } },
    { $limit: parseInt(limit) },
    { $project: projectFields },
  ]);

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

// @desc    Bulk import medicines (CSV / Excel)
// @route   POST /api/medicines/bulk-import
//
// Accepts a `category` value that's either:
//   - the legacy enum (e.g. "Tablet", "Capsule"), or
//   - the friendly Category name (e.g. "Tablets", "Syrups & Suspensions")
// In both cases, this resolves the matching Category doc and sets `categoryId`
// so imported rows show up under their category immediately (no Sync needed).
exports.bulkImport = asyncHandler(async (req, res) => {
  const { medicines } = req.body;
  const storeId = req.user.storeId;

  if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ success: false, message: 'No medicines to import' });
  }

  // Friendly name → enum (mirror of the map in category.controller)
  const NAME_TO_ENUM = {
    'Tablets': 'Tablet', 'Capsules': 'Capsule',
    'Syrups & Suspensions': 'Syrup',
    'Injections': 'Injection',
    'Creams & Ointments': 'Cream/Ointment',
    'Eye/Ear Drops': 'Drops',
    'Inhalers': 'Inhaler', 'Sprays': 'Spray',
    'Suppositories': 'Suppository',
    'Sachets & Powders': 'Sachet',
    'Surgical Items': 'Surgical', 'Solutions': 'Solution',
    'Medical Devices': 'Device', 'Patches': 'Patch',
    'Cosmetics & Skin Care': 'Cosmetic',
    'OTC Medicines': 'OTC',
    'Baby Care': 'Baby Care',
    'Nutrition & Supplements': 'Nutrition',
    'Gels & Lotions': 'Gel',
    'Ayurvedic & Herbal': 'OTC',
  };
  const ENUM_TO_NAME = {
    Tablet: 'Tablets', Capsule: 'Capsules',
    Syrup: 'Syrups & Suspensions', Suspension: 'Syrups & Suspensions',
    Injection: 'Injections',
    'Cream/Ointment': 'Creams & Ointments',
    Drops: 'Eye/Ear Drops',
    Inhaler: 'Inhalers', Spray: 'Sprays',
    Suppository: 'Suppositories',
    Sachet: 'Sachets & Powders', Powder: 'Sachets & Powders',
    Surgical: 'Surgical Items', Solution: 'Surgical Items',
    Device: 'Medical Devices', Patch: 'Medical Devices',
    Cosmetic: 'Cosmetics & Skin Care',
    OTC: 'OTC Medicines',
    'Baby Care': 'Baby Care',
    Nutrition: 'Nutrition & Supplements',
    Gel: 'Gels & Lotions', Lotion: 'Gels & Lotions',
    Strip: 'Tablets',
  };

  // Pre-load this store's category docs into a name→id map
  const Category = require('../models/Category');
  const cats = await Category.find({ storeId, isActive: true }).select('name _id').lean();
  const catIdByName = new Map(cats.map((c) => [c.name, c._id]));

  // Step 1 — normalise + assign defaults in memory (cheap, synchronous)
  const docs = medicines.map((m) => {
    const med = { ...m, storeId, addedBy: req.user._id };
    if (!med.barcode) med.barcode = generateBarcode();
    if (med.category) {
      const trimmed = String(med.category).trim();
      if (NAME_TO_ENUM[trimmed]) {
        const friendlyName = trimmed;
        med.category = NAME_TO_ENUM[friendlyName];
        if (!med.categoryId && catIdByName.has(friendlyName)) {
          med.categoryId = catIdByName.get(friendlyName);
        }
      } else {
        med.category = trimmed;
        const friendly = ENUM_TO_NAME[trimmed];
        if (!med.categoryId && friendly && catIdByName.has(friendly)) {
          med.categoryId = catIdByName.get(friendly);
        }
      }
    }
    return med;
  });

  // Step 2 — pre-validate so we get clean per-row errors AND only send valid rows to mongo
  const errors = [];
  const valid = [];
  const validToOrig = []; // valid[k] originated at docs[validToOrig[k]]
  docs.forEach((doc, i) => {
    const verr = new Medicine(doc).validateSync();
    if (verr) {
      errors.push({
        row: i + 2, // +2: row 1 is the header
        medicine: doc.medicineName || `(row ${i + 2})`,
        error: verr.message,
      });
    } else {
      valid.push(doc);
      validToOrig.push(i);
    }
  });

  // Step 3 — single bulk insert (orders of magnitude faster than per-doc create)
  let imported = 0;
  if (valid.length > 0) {
    try {
      const inserted = await Medicine.insertMany(valid, { ordered: false });
      imported = inserted.length;
    } catch (err) {
      // ordered:false rejects on partial failure — but successful inserts still went through
      imported = err.insertedDocs?.length || err.result?.nInserted || 0;
      const writeErrors = err.writeErrors || err.result?.writeErrors || [];
      for (const we of writeErrors) {
        const validIdx = we.index ?? we.err?.index ?? 0;
        const origIdx = validToOrig[validIdx] ?? validIdx;
        const med = docs[origIdx] || {};
        errors.push({
          row: origIdx + 2,
          medicine: med.medicineName || `(row ${origIdx + 2})`,
          error: we.errmsg || we.err?.errmsg || we.message || 'Insert failed',
        });
      }
      // If we got a fatal error with no per-row info, surface it on row 0 so the caller knows
      if (writeErrors.length === 0 && imported === 0) {
        errors.push({ row: 0, medicine: '(bulk)', error: err.message || 'Bulk insert failed' });
      }
    }
  }

  res.json({ success: true, imported, errors, total: medicines.length });
});
