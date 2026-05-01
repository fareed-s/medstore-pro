const Store = require('../models/Store');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const MasterMedicine = require('../models/MasterMedicine');
const Category = require('../models/Category');
const ActivityLog = require('../models/ActivityLog');
const slugify = require('slugify');
const { asyncHandler } = require('../utils/errorHandler');
const { generateBarcode } = require('../utils/helpers');
const { isValidPlan, computeEndDate, VALID_PLANS } = require('../utils/plans');
const { invalidateStoreCache, invalidateUserCache } = require('../middleware/auth');

// Default category set seeded into every newly-created store, matching the
// Medicine.category enum 1:1 via ENUM_TO_NAME so the catalog auto-link works
// out of the box.
const DEFAULT_CATEGORY_NAMES = [
  'Tablets', 'Capsules', 'Syrups & Suspensions', 'Injections', 'Creams & Ointments',
  'Eye/Ear Drops', 'Inhalers', 'Suppositories', 'Sachets & Powders', 'Surgical Items',
  'Medical Devices', 'Cosmetics & Skin Care', 'OTC Medicines', 'Baby Care',
  'Nutrition & Supplements', 'Gels & Lotions', 'Sprays', 'Ayurvedic & Herbal',
  'Solutions', 'Patches',
];

// Idempotent: only inserts categories that don't already exist for this store.
async function seedDefaultCategories(storeId) {
  const existing = await Category.find({ storeId }).select('name').lean();
  const existingSet = new Set(existing.map((c) => c.name));
  const toInsert = DEFAULT_CATEGORY_NAMES
    .filter((n) => !existingSet.has(n))
    .map((name) => ({
      storeId,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      isActive: true,
    }));
  if (toInsert.length) {
    try { await Category.insertMany(toInsert, { ordered: false }); } catch { /* concurrent insert race — fine */ }
  }
  return toInsert.length;
}

// Friendly category-name ↔ enum maps (mirrored from medicine.controller.bulkImport).
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

// @desc    Global platform stats
exports.getGlobalStats = asyncHandler(async (req, res) => {
  const [totalStores, activeStores, pendingApproval, totalUsers, totalProducts] = await Promise.all([
    Store.countDocuments(),
    Store.countDocuments({ isActive: true, isApproved: true }),
    Store.countDocuments({ isApproved: false }),
    User.countDocuments({ role: { $ne: 'SuperAdmin' } }),
    Medicine.countDocuments(),
  ]);

  const storesByPlan = await Store.aggregate([
    { $group: { _id: '$plan', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: { totalStores, activeStores, pendingApproval, totalUsers, totalProducts, storesByPlan },
  });
});

// @desc    List all stores
exports.getStores = asyncHandler(async (req, res) => {
  const { status, plan, search, page = 1, limit = 25 } = req.query;
  const filter = {};

  if (status === 'active') { filter.isActive = true; filter.isApproved = true; }
  if (status === 'pending') filter.isApproved = false;
  if (status === 'inactive') filter.isActive = false;
  if (plan) filter.plan = plan;
  if (search) {
    filter.$or = [
      { storeName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { ownerName: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Store.countDocuments(filter);
  const stores = await Store.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  // Attach the StoreAdmin's avatar to each store row in ONE query (instead
  // of N findOne calls). The list page uses this to show a small thumbnail.
  const ids = stores.map((s) => s._id);
  const admins = await User.find({ storeId: { $in: ids }, role: 'StoreAdmin' })
    .select('storeId avatar name')
    .lean();
  const adminByStore = new Map(admins.map((a) => [String(a.storeId), a]));
  for (const s of stores) {
    const a = adminByStore.get(String(s._id));
    if (a) {
      s.adminAvatar = a.avatar || null;
      s.adminName = a.name || s.ownerName;
    }
  }

  res.json({ success: true, data: stores, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

// @desc    Create new store + StoreAdmin user atomically (SuperAdmin only)
// @route   POST /api/superadmin/stores
exports.createStore = asyncHandler(async (req, res) => {
  const {
    storeName, phone, address,
    drugLicenseNumber, drugLicenseExpiry, gstNumber,
    ownerName, ownerPhone,
    plan = 'Trial',
    planPrice = 0,
    trialDays,
    hasMasterCatalog = false,
    // StoreAdmin credentials
    adminName, adminEmail, adminPassword,
  } = req.body;

  if (!storeName || !phone || !ownerName || !adminEmail || !adminPassword) {
    return res.status(400).json({
      success: false,
      message: 'storeName, phone, ownerName, adminEmail and adminPassword are required',
    });
  }
  if (adminPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Admin password must be at least 6 characters' });
  }
  if (!isValidPlan(plan)) {
    return res.status(400).json({ success: false, message: `Plan must be one of: ${VALID_PLANS.join(', ')}` });
  }
  if (plan === 'Trial' && (!trialDays || parseInt(trialDays) < 1)) {
    return res.status(400).json({ success: false, message: 'Trial plan requires trialDays (>= 1)' });
  }

  // Email must be unique across stores (Store.email has a unique index)
  const existingStore = await Store.findOne({ email: adminEmail.toLowerCase() });
  if (existingStore) {
    return res.status(400).json({ success: false, message: 'A store with this admin email already exists' });
  }

  const start = new Date();
  const end = computeEndDate(plan, { trialDays, start });

  const store = await Store.create({
    storeName,
    slug: slugify(storeName, { lower: true, strict: true }) + '-' + Date.now().toString(36),
    email: adminEmail.toLowerCase(),
    phone,
    address: address || {},
    drugLicenseNumber, drugLicenseExpiry, gstNumber,
    ownerName,
    ownerPhone: ownerPhone || phone,
    ownerEmail: adminEmail.toLowerCase(),
    plan,
    planPrice: parseFloat(planPrice) || 0,
    trialDays: plan === 'Trial' ? parseInt(trialDays) : undefined,
    planStartDate: start,
    planEndDate: end,
    hasMasterCatalog: !!hasMasterCatalog,
    isApproved: true,
    isActive: true,
    approvedBy: req.user._id,
    approvedAt: new Date(),
  });

  // Auto-seed standard categories so Quick Stock In + medicine import "just work".
  try { await seedDefaultCategories(store._id); }
  catch (err) { console.error('[CREATE-STORE] category seed failed:', err.message); }

  let admin;
  try {
    admin = new User({
      name: adminName || ownerName,
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      phone: ownerPhone || phone,
      role: 'StoreAdmin',
      storeId: store._id,
      isActive: true,
    });
    admin.setDefaultPermissions();
    await admin.save();
  } catch (err) {
    // Rollback the store if user creation fails (e.g. duplicate email)
    await Store.findByIdAndDelete(store._id);
    return res.status(400).json({
      success: false,
      message: err.code === 11000 ? 'Admin email already in use' : (err.message || 'Failed to create store admin'),
    });
  }

  // If SuperAdmin granted catalog access at create time, copy the master
  // catalog into this brand-new store immediately.
  let catalogSync = null;
  if (store.hasMasterCatalog) {
    try {
      catalogSync = await syncCatalogToStore(store, req.user._id);
      console.log(`[CATALOG-AT-CREATE] ${store.storeName}: inserted ${catalogSync.inserted} of ${catalogSync.attempted}`);
    } catch (err) {
      console.error(`[CATALOG-AT-CREATE] sync failed for ${store.storeName}:`, err.message);
    }
  }

  await ActivityLog.create({
    storeId: store._id,
    userId: req.user._id,
    action: 'Store created by SuperAdmin',
    module: 'store',
    details: `Store "${storeName}" created — plan ${plan} (Rs.${planPrice}), expires ${end?.toISOString().slice(0,10)}${catalogSync ? `, catalog +${catalogSync.inserted}` : ''}`,
    entityId: store._id,
    entityType: 'Store',
  }).catch(() => { /* non-fatal */ });

  res.status(201).json({
    success: true,
    data: {
      store,
      admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      catalogSync,
    },
  });
});

// @desc    Approve store
exports.approveStore = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  store.isApproved = true;
  store.approvedBy = req.user._id;
  store.approvedAt = new Date();
  await store.save();
  invalidateStoreCache(store._id);

  res.json({ success: true, data: store });
});

// @desc    Toggle store active status (suspend / reactivate)
exports.toggleStore = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
  store.isActive = !store.isActive;
  if (store.isActive) {
    store.suspendedReason = undefined;
    store.suspendedAt = undefined;
  } else {
    store.suspendedReason = req.body?.reason || 'Manually suspended by SuperAdmin';
    store.suspendedAt = new Date();
  }
  await store.save();
  invalidateStoreCache(store._id);
  res.json({ success: true, data: store });
});

// @desc    Suspend store (with optional reason)
exports.suspendStore = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
  store.isActive = false;
  store.suspendedReason = req.body?.reason || 'Manually suspended by SuperAdmin';
  store.suspendedAt = new Date();
  await store.save();
  invalidateStoreCache(store._id);

  await ActivityLog.create({
    storeId: store._id,
    userId: req.user._id,
    action: 'Store suspended',
    module: 'store',
    details: store.suspendedReason,
    entityId: store._id,
    entityType: 'Store',
  }).catch(() => {});

  res.json({ success: true, data: store });
});

// @desc    Reactivate a suspended store (without changing plan)
exports.reactivateStore = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
  store.isActive = true;
  store.suspendedReason = undefined;
  store.suspendedAt = undefined;
  await store.save();
  invalidateStoreCache(store._id);
  res.json({ success: true, data: store });
});

// @desc    List all users across all stores
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, search, limit = 200 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  const users = await User.find(filter).populate('storeId', 'storeName').select('-password').sort({ createdAt: -1 }).limit(parseInt(limit));
  res.json({ success: true, data: users });
});

// @desc    Update user (activate/deactivate)
exports.updateUser = asyncHandler(async (req, res) => {
  const { isActive, role } = req.body;
  const updates = {};
  if (typeof isActive === 'boolean') updates.isActive = isActive;
  if (role) updates.role = role;
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  invalidateUserCache(user._id);
  res.json({ success: true, data: user });
});

// @desc    Update store plan (and reset start/end + price). Reactivates store.
// @route   PUT /api/superadmin/stores/:id/plan
exports.updatePlan = asyncHandler(async (req, res) => {
  const { plan, planPrice = 0, trialDays } = req.body;
  if (!isValidPlan(plan)) {
    return res.status(400).json({ success: false, message: `Plan must be one of: ${VALID_PLANS.join(', ')}` });
  }
  if (plan === 'Trial' && (!trialDays || parseInt(trialDays) < 1)) {
    return res.status(400).json({ success: false, message: 'Trial plan requires trialDays (>= 1)' });
  }

  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  const start = new Date();
  store.plan = plan;
  store.planPrice = parseFloat(planPrice) || 0;
  store.trialDays = plan === 'Trial' ? parseInt(trialDays) : undefined;
  store.planStartDate = start;
  store.planEndDate = computeEndDate(plan, { trialDays, start });
  // Changing the plan reactivates the store (treats this as a renewal/upgrade).
  store.isActive = true;
  store.suspendedReason = undefined;
  store.suspendedAt = undefined;
  await store.save();
  invalidateStoreCache(store._id);

  await ActivityLog.create({
    storeId: store._id,
    userId: req.user._id,
    action: 'Plan updated',
    module: 'store',
    details: `Plan → ${plan} (Rs.${store.planPrice}), expires ${store.planEndDate?.toISOString().slice(0,10)}`,
    entityId: store._id,
    entityType: 'Store',
  }).catch(() => {});

  res.json({ success: true, data: store });
});

// Valid enum values, mirrored from the schemas. Any input that doesn't match
// is rewritten to the schema default so a single bad cell doesn't drop the
// whole row.
const CATEGORY_ENUM = new Set(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream/Ointment', 'Drops', 'Inhaler', 'Suppository', 'Sachet', 'Powder', 'Surgical', 'Device', 'Cosmetic', 'OTC', 'Baby Care', 'Nutrition', 'Gel', 'Lotion', 'Solution', 'Suspension', 'Spray', 'Patch', 'Strip']);
const SCHEDULE_ENUM = new Set(['OTC', 'Schedule-G', 'Schedule-H', 'Schedule-H1', 'Schedule-X']);
const UNIT_ENUM = new Set(['tablet', 'capsule', 'ml', 'mg', 'g', 'piece', 'strip', 'bottle', 'tube', 'vial', 'ampoule', 'sachet', 'pack']);
const DOSAGE_ENUM = new Set(['Oral', 'Topical', 'Injectable', 'Ophthalmic', 'Otic', 'Nasal', 'Rectal', 'Inhalation', 'Sublingual', 'Transdermal']);
const STORAGE_ENUM = new Set(['Room Temperature', 'Refrigerate (2-8°C)', 'Freeze', 'Protect from Light', 'Cool & Dry Place']);

// Normalise a raw row from the upload sheet onto the Medicine/MasterMedicine
// schema fields. Maps friendly category names → enum values, and scrubs any
// out-of-enum value to the schema default — so one bad cell doesn't drop the
// whole row to "0 inserted".
const normaliseCategory = (raw) => {
  const out = { ...raw };

  if (out.category) {
    const trimmed = String(out.category).trim();
    const mapped = NAME_TO_ENUM[trimmed] || trimmed;
    out.category = CATEGORY_ENUM.has(mapped) ? mapped : 'Tablet';
  }
  if (out.schedule && !SCHEDULE_ENUM.has(String(out.schedule).trim())) {
    out.schedule = 'OTC';
  }
  if (out.unitOfMeasure && !UNIT_ENUM.has(String(out.unitOfMeasure).trim().toLowerCase())) {
    out.unitOfMeasure = 'tablet';
  } else if (out.unitOfMeasure) {
    out.unitOfMeasure = String(out.unitOfMeasure).trim().toLowerCase();
  }
  if (out.dosageForm && !DOSAGE_ENUM.has(String(out.dosageForm).trim())) {
    out.dosageForm = 'Oral';
  }
  if (out.storageCondition && !STORAGE_ENUM.has(String(out.storageCondition).trim())) {
    out.storageCondition = 'Room Temperature';
  }

  // Coerce numeric fields (XLSX sometimes hands us strings)
  for (const k of ['costPrice', 'mrp', 'salePrice', 'taxRate', 'unitsPerPack', 'lowStockThreshold', 'reorderLevel', 'reorderQuantity']) {
    if (out[k] !== undefined && out[k] !== null && out[k] !== '') {
      const n = Number(out[k]);
      if (Number.isFinite(n)) out[k] = n;
      else delete out[k];
    }
  }

  return out;
};

// Validate each candidate doc against its model schema. Only valid rows are
// returned; invalid rows are returned as { row, error } so the caller can
// log/surface them. Without this step a single bad row can crash an
// `insertMany({ ordered: false })` chunk and we get 0 inserted.
const splitValid = (rawDocs, Model) => {
  const valid = [];
  const errors = [];
  rawDocs.forEach((d, i) => {
    const verr = new Model(d).validateSync();
    if (verr) {
      errors.push({ index: i, name: d.medicineName, error: verr.message });
    } else {
      valid.push(d);
    }
  });
  return { valid, errors };
};

// Copy missing master-catalog medicines into a single store. Used both when
// SuperAdmin grants catalog access AND after a bulk-master upload (for stores
// that already have access). Returns counts.
const syncCatalogToStore = async (store, addedBy) => {
  const masters = await MasterMedicine.find({}).lean();
  if (!masters.length) return { storeId: store._id, storeName: store.storeName, attempted: 0, inserted: 0, skipped: 0, validationErrors: 0 };

  // ── PERF ─────────────────────────────────────────────────────────────
  // Only query existing rows whose names actually overlap with the master
  // catalog. The old code loaded ALL store medicines (could be 30k+) just
  // to dedupe — wasteful when re-syncing 1000 names.
  const candidateNames = masters.map((m) => m.medicineName).filter(Boolean);
  const existing = await Medicine.find({
    storeId: store._id,
    medicineName: { $in: candidateNames },
  }).select('medicineName').lean();
  const existingNames = new Set(existing.map((m) => (m.medicineName || '').toLowerCase()));

  const cats = await Category.find({ storeId: store._id, isActive: true }).select('name _id').lean();
  const catIdByName = new Map(cats.map((c) => [c.name, c._id]));

  const docs = masters
    .filter((m) => !existingNames.has(String(m.medicineName).toLowerCase()))
    .map((m) => {
      const friendly = ENUM_TO_NAME[m.category];
      const categoryId = friendly && catIdByName.has(friendly) ? catIdByName.get(friendly) : undefined;
      // Strip MasterMedicine internals and add per-store fields. Generate a
      // fresh barcode per store so the same drug doesn't collide across stores.
      const { _id, __v, createdAt, updatedAt, uploadedBy, ...rest } = m;
      return {
        ...rest,
        storeId: store._id,
        currentStock: 0,
        addedBy,
        barcode: rest.barcode || generateBarcode(),
        ...(categoryId ? { categoryId } : {}),
      };
    });

  const { valid, errors } = splitValid(docs, Medicine);

  let inserted = 0;
  if (valid.length) {
    try {
      const result = await Medicine.insertMany(valid, { ordered: false });
      inserted = result.length;
    } catch (err) {
      inserted = err.insertedDocs?.length || err.result?.nInserted || 0;
    }
  }
  return {
    storeId: store._id,
    storeName: store.storeName,
    attempted: docs.length,
    inserted,
    skipped: masters.length - docs.length,
    validationErrors: errors.length,
  };
};

// @desc    Master-catalog bulk upload — SuperAdmin uploads a medicine list.
//          Step 1: rows are saved into MasterMedicine (the catalog).
//          Step 2: every store with hasMasterCatalog=true receives a copy
//                  with currentStock=0.
//          Stores without catalog access stay untouched.
// @route   POST /api/superadmin/medicines/bulk-master
exports.bulkMasterMedicines = asyncHandler(async (req, res) => {
  const { medicines } = req.body;
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ success: false, message: 'No medicines to import' });
  }

  // ── Step 1: upsert into MasterMedicine ─────────────────────────────────
  const masterDocs = medicines
    .filter((m) => m && m.medicineName)
    .map((m) => {
      const med = normaliseCategory(m);
      med.uploadedBy = req.user._id;
      return med;
    });

  // Existing master names (case-insensitive) — skip duplicates.
  const existingMaster = await MasterMedicine.find({}).select('medicineName').lean();
  const existingMasterNames = new Set(existingMaster.map((m) => (m.medicineName || '').toLowerCase()));

  const newMasterDocs = masterDocs.filter(
    (d) => !existingMasterNames.has(String(d.medicineName).toLowerCase())
  );
  const { valid: validMaster, errors: masterErrors } = splitValid(newMasterDocs, MasterMedicine);

  let masterInserted = 0;
  if (validMaster.length) {
    try {
      const result = await MasterMedicine.insertMany(validMaster, { ordered: false });
      masterInserted = result.length;
    } catch (err) {
      masterInserted = err.insertedDocs?.length || err.result?.nInserted || 0;
    }
  }

  // ── Step 2: sync to every store that has catalog access ────────────────
  const stores = await Store.find({
    isActive: true, isApproved: true, hasMasterCatalog: true,
  }).select('_id storeName');

  const summary = [];
  for (const store of stores) {
    const r = await syncCatalogToStore(store, req.user._id);
    summary.push(r);
  }

  // ── Logging ────────────────────────────────────────────────────────────
  const totalSyncedToStores = summary.reduce((s, r) => s + r.inserted, 0);
  const masterTotal = await MasterMedicine.countDocuments();
  console.log(`[MASTER-CATALOG] ${req.user.email} uploaded ${medicines.length} rows → master +${masterInserted}, master errors: ${masterErrors.length}, total master now: ${masterTotal}`);
  console.log(`[MASTER-CATALOG] synced to ${stores.length} catalog-enabled store(s), total ${totalSyncedToStores} medicines copied`);
  if (masterErrors.length) {
    console.log(`[MASTER-CATALOG] sample validation errors:`);
    for (const e of masterErrors.slice(0, 5)) {
      console.log(`    · "${e.name}": ${e.error}`);
    }
  }
  for (const s of summary) {
    console.log(`  · ${s.storeName}: inserted ${s.inserted} of ${s.attempted}${s.validationErrors ? ` (${s.validationErrors} validation errors)` : ''}`);
  }

  await ActivityLog.create({
    userId: req.user._id,
    action: 'Master catalog upload',
    module: 'medicine',
    details: `${medicines.length} rows · master +${masterInserted} · synced to ${stores.length} store(s)`,
  }).catch(() => {});

  res.json({
    success: true,
    masterInserted,
    masterErrors: masterErrors.length,
    masterErrorSamples: masterErrors.slice(0, 20).map((e) => ({ name: e.name, error: e.error })),
    masterTotal,
    catalogStores: stores.length,
    totalSyncedToStores,
    summary,
    total: medicines.length,
    note: stores.length === 0
      ? 'No store has catalog access yet — go to All Stores and grant access.'
      : undefined,
  });
});

// @desc    Master catalog stats (current total in MasterMedicine collection)
// @route   GET /api/superadmin/medicines/master/stats
exports.getMasterStats = asyncHandler(async (req, res) => {
  const total = await MasterMedicine.countDocuments();
  res.json({ success: true, data: { total } });
});

// @desc    Grant or revoke master-catalog access for a store. Granting
//          immediately syncs every MasterMedicine into that store.
// @route   PUT /api/superadmin/stores/:id/catalog
//          body: { enabled: boolean }
exports.setStoreCatalog = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  store.hasMasterCatalog = !!enabled;
  await store.save();
  invalidateStoreCache(store._id);

  let syncResult = null;
  let masterTotal = 0;
  if (enabled) {
    masterTotal = await MasterMedicine.countDocuments();
    syncResult = await syncCatalogToStore(store, req.user._id);
    console.log(`[CATALOG-GRANT] ${store.storeName}: master has ${masterTotal} → inserted ${syncResult.inserted} of ${syncResult.attempted}`);
  }

  await ActivityLog.create({
    storeId: store._id,
    userId: req.user._id,
    action: enabled ? 'Catalog access granted' : 'Catalog access revoked',
    module: 'medicine',
    details: enabled
      ? `Synced ${syncResult?.inserted || 0} medicines into ${store.storeName}`
      : `Revoked catalog access for ${store.storeName}`,
    entityId: store._id,
    entityType: 'Store',
  }).catch(() => {});

  res.json({ success: true, data: store, syncResult, masterTotal });
});

// @desc    Reset a store's admin password. Returns the admin's email so the
//          SuperAdmin can share the new credentials (WhatsApp-ready flow).
// @route   PUT /api/superadmin/stores/:id/admin-password
//          body: { newPassword }
exports.resetStoreAdminPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }
  const store = await Store.findById(req.params.id).select('_id storeName email');
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  // The StoreAdmin user is the one created with the store. Pick the most
  // recently-created StoreAdmin for this store as the canonical admin.
  const admin = await User.findOne({ storeId: store._id, role: 'StoreAdmin' })
    .sort({ createdAt: 1 })
    .select('+password');
  if (!admin) {
    return res.status(404).json({ success: false, message: 'No store admin user found for this store' });
  }

  admin.password = newPassword;       // pre-save hook will hash
  admin.loginAttempts = 0;
  admin.lockUntil = undefined;
  await admin.save();
  invalidateUserCache(admin._id);

  await ActivityLog.create({
    storeId: store._id,
    userId: req.user._id,
    action: 'Store admin password reset',
    module: 'user',
    details: `Password reset for ${admin.email}`,
    entityId: admin._id,
    entityType: 'User',
  }).catch(() => {});

  res.json({
    success: true,
    data: {
      adminEmail: admin.email,
      adminName: admin.name,
      storeName: store.storeName,
    },
  });
});
