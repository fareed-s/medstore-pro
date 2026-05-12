const mongoose = require('mongoose');
const Store = require('../models/Store');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const MasterMedicine = require('../models/MasterMedicine');
const MedicineSuggestion = require('../models/MedicineSuggestion');
const Category = require('../models/Category');
const ActivityLog = require('../models/ActivityLog');
const ControlledModuleSettings = require('../models/ControlledModuleSettings');
const ControlledAccessLog = require('../models/ControlledAccessLog');
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

// @desc    Permanently delete a store and ALL its data (users, medicines,
//          batches, sales, customers, suppliers, ...). Cascades by enumerating
//          every collection in the DB and deleting docs whose `storeId` matches.
//          Requires `?confirm=DELETE` in the query string as an accidental-
//          deletion guard. Cannot be undone — backups are the only recovery.
exports.deleteStore = asyncHandler(async (req, res) => {
  if (req.query.confirm !== 'DELETE') {
    return res.status(400).json({
      success: false,
      message: 'Confirmation required. Pass ?confirm=DELETE to proceed.',
    });
  }

  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  // Capture identifying info BEFORE deletion so the audit log is meaningful.
  const snapshot = {
    _id: store._id,
    storeName: store.storeName,
    slug: store.slug,
    email: store.email,
    plan: store.plan,
  };

  // Cascade delete: walk every collection and delete docs scoped to this
  // store. Collections that don't have a `storeId` field will simply match
  // zero docs. Stores collection itself is skipped here and dropped last.
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const cascadeCounts = {};

  for (const col of collections) {
    if (col.name === 'stores') continue;
    try {
      const r = await db.collection(col.name).deleteMany({ storeId: store._id });
      if (r.deletedCount > 0) cascadeCounts[col.name] = r.deletedCount;
    } catch (err) {
      console.error(`[deleteStore] failed to clean ${col.name}:`, err.message);
    }
  }

  // Now delete the store doc itself.
  await Store.deleteOne({ _id: store._id });
  invalidateStoreCache(store._id);

  // Audit log — write AFTER deletion (with null storeId so it isn't deleted
  // by the cascade) so we have a permanent record of who deleted what.
  await ActivityLog.create({
    storeId: null,
    userId: req.user._id,
    action: 'Store deleted',
    module: 'store',
    details: `Deleted store "${snapshot.storeName}" (${snapshot.email}). Cascade: ${
      JSON.stringify(cascadeCounts)
    }`,
    entityId: snapshot._id,
    entityType: 'Store',
  }).catch(() => {});

  res.json({
    success: true,
    message: `Store "${snapshot.storeName}" and all related data permanently deleted.`,
    data: { snapshot, cascadeCounts },
  });
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

// ════════════════════════════════════════════════════════════════════════════
// Controlled / Narcotic Drugs — Hidden Module Administration
// Only the SuperAdmin can enable/disable, set the unlock password, or manage
// which users in a store may unlock it. Every change here is logged in
// ControlledAccessLog (immutable) AND ActivityLog (regular audit feed).
// ════════════════════════════════════════════════════════════════════════════

// Helper — find or lazily create the settings doc for a store.
const getOrCreateModuleSettings = async (storeId) => {
  let s = await ControlledModuleSettings.findOne({ storeId }).select('+passwordHash');
  if (!s) {
    s = await ControlledModuleSettings.create({ storeId, enabled: false });
    s = await ControlledModuleSettings.findById(s._id).select('+passwordHash');
  }
  return s;
};

const writeModuleAuditLog = (storeId, userId, event, reason, req) =>
  ControlledAccessLog.create({
    storeId,
    userId,
    userEmail: req.user?.email,
    userName: req.user?.name,
    event,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  }).catch((err) => console.error('[ControlledAccessLog] write failed:', err.message));

// @desc    Read the controlled-module settings for a store. Includes the
//          allowed-user list (populated) so the UI can render names.
// @route   GET /api/superadmin/stores/:id/controlled-module
exports.getControlledModule = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id).select('_id storeName');
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  const settings = await getOrCreateModuleSettings(store._id);

  // Pull all active users for this store so the SuperAdmin can pick allow-list members.
  const users = await User.find({ storeId: store._id, isActive: true })
    .select('_id name email role avatar')
    .sort({ name: 1 })
    .lean();

  res.json({
    success: true,
    data: {
      store: { _id: store._id, storeName: store.storeName },
      enabled: settings.enabled,
      hasPassword: !!settings.passwordHash,
      passwordSetAt: settings.passwordSetAt,
      inspectionMode: settings.inspectionMode,
      inspectionModeAt: settings.inspectionModeAt,
      allowedUserIds: settings.allowedUserIds.map(String),
      lockedUntil: settings.lockedUntil,
      failedAttempts: settings.failedAttempts,
      users,
    },
  });
});

// @desc    Enable/disable + (optionally) set/reset password + toggle inspection.
//          One endpoint that handles all SuperAdmin-controlled flags so the
//          UI can save everything in a single round-trip.
// @route   PUT /api/superadmin/stores/:id/controlled-module
//          body: { enabled?, password?, inspectionMode? }
exports.updateControlledModule = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  const { enabled, password, inspectionMode } = req.body;
  const settings = await getOrCreateModuleSettings(store._id);

  const changes = [];

  if (typeof enabled === 'boolean' && enabled !== settings.enabled) {
    settings.enabled = enabled;
    changes.push(enabled ? 'enabled' : 'disabled');
    writeModuleAuditLog(store._id, req.user._id, enabled ? 'enabled' : 'disabled', null, req);
  }

  if (typeof inspectionMode === 'boolean' && inspectionMode !== settings.inspectionMode) {
    settings.inspectionMode = inspectionMode;
    settings.inspectionModeAt = inspectionMode ? new Date() : undefined;
    changes.push(inspectionMode ? 'inspection-on' : 'inspection-off');
    writeModuleAuditLog(store._id, req.user._id, inspectionMode ? 'inspection_on' : 'inspection_off', null, req);
  }

  if (typeof password === 'string' && password.length > 0) {
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Module password must be at least 6 characters' });
    }
    await settings.setPassword(password);
    changes.push('password-set');
    writeModuleAuditLog(store._id, req.user._id, 'password_set', null, req);
  }

  await settings.save();

  await ActivityLog.create({
    storeId: store._id,
    userId: req.user._id,
    action: 'Controlled module updated',
    module: 'regulatory',
    details: `Changes: ${changes.join(', ') || 'none'}`,
    entityId: store._id,
    entityType: 'Store',
  }).catch(() => {});

  res.json({
    success: true,
    data: {
      enabled: settings.enabled,
      hasPassword: !!settings.passwordHash,
      passwordSetAt: settings.passwordSetAt,
      inspectionMode: settings.inspectionMode,
      changes,
    },
  });
});

// @desc    Set the allowed-user list for the module. Replaces the list
//          wholesale (frontend always sends the full desired set).
// @route   PUT /api/superadmin/stores/:id/controlled-module/users
//          body: { userIds: [...] }
exports.setControlledModuleUsers = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

  const { userIds } = req.body;
  if (!Array.isArray(userIds)) {
    return res.status(400).json({ success: false, message: 'userIds[] required' });
  }

  // Validate every id belongs to this store — defends against the SuperAdmin
  // accidentally pasting an id from another tenant.
  const valid = await User.find({
    _id: { $in: userIds },
    storeId: store._id,
    isActive: true,
  }).select('_id name email').lean();

  const validIds = valid.map((u) => u._id);
  const settings = await getOrCreateModuleSettings(store._id);
  const before = new Set(settings.allowedUserIds.map(String));
  const after = new Set(validIds.map(String));

  // Diff so we can write a granular audit row per user.
  for (const id of after) {
    if (!before.has(id)) writeModuleAuditLog(store._id, req.user._id, 'user_allowed', `user ${id}`, req);
  }
  for (const id of before) {
    if (!after.has(id)) writeModuleAuditLog(store._id, req.user._id, 'user_revoked', `user ${id}`, req);
  }

  settings.allowedUserIds = validIds;
  await settings.save();

  res.json({
    success: true,
    data: {
      allowedUserIds: settings.allowedUserIds.map(String),
      added: [...after].filter((id) => !before.has(id)).length,
      removed: [...before].filter((id) => !after.has(id)).length,
    },
  });
});

// @desc    Read access logs for a store (paginated, newest first).
// @route   GET /api/superadmin/stores/:id/controlled-module/logs?page=1&limit=50
exports.getControlledModuleLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, event } = req.query;
  const filter = { storeId: req.params.id };
  if (event) filter.event = event;

  const [total, logs] = await Promise.all([
    ControlledAccessLog.countDocuments(filter),
    ControlledAccessLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: { total, page: parseInt(page), limit: parseInt(limit) },
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CROWDSOURCED MEDICINE SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════
// Stores add medicines manually; if they're not in MasterMedicine, the
// store-create flow upserts them into MedicineSuggestion (one row per name,
// contributors tracked via $addToSet). SuperAdmin reviews here → approve
// copies into MasterMedicine and (optionally) pushes to catalog-enabled
// stores; reject just marks rejected for audit.

// @desc    List medicine suggestions
// @route   GET /api/superadmin/medicine-suggestions
//          query: status=pending|approved|rejected, page, limit, search
exports.listMedicineSuggestions = asyncHandler(async (req, res) => {
  const { status = 'pending', page = 1, limit = 25, search } = req.query;
  const filter = { status };
  if (search && search.trim()) {
    const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.medicineName = { $regex: `^${safe}`, $options: 'i' };
  }

  const [total, suggestions, pendingCount] = await Promise.all([
    MedicineSuggestion.countDocuments(filter),
    MedicineSuggestion.find(filter)
      .collation({ locale: 'en', strength: 2 })
      .sort({ contributorCount: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('contributedByStoreIds', 'storeName')
      .populate('firstContributedBy', 'name email')
      .lean(),
    MedicineSuggestion.countDocuments({ status: 'pending' }),
  ]);

  res.json({
    success: true,
    data: suggestions,
    pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    pendingCount,
  });
});

// @desc    Approve a suggestion — copy fields into MasterMedicine, then
//          mark the suggestion 'approved'. If the name already exists in
//          MasterMedicine (race condition), still mark approved.
// @route   PUT /api/superadmin/medicine-suggestions/:id/approve
//          body: optional field overrides { medicineName?, salePrice?, ... }
exports.approveMedicineSuggestion = asyncHandler(async (req, res) => {
  const suggestion = await MedicineSuggestion.findById(req.params.id);
  if (!suggestion) return res.status(404).json({ success: false, message: 'Suggestion not found' });
  if (suggestion.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Already ${suggestion.status}` });
  }

  // Apply any SuperAdmin tweaks made on the review screen (typo fixes,
  // schedule corrections, MRP cleanup) — these win over the contributor's
  // values when copying into MasterMedicine.
  const overrides = req.body || {};
  const masterData = {
    medicineName: overrides.medicineName || suggestion.medicineName,
    genericName: overrides.genericName ?? suggestion.genericName,
    manufacturer: overrides.manufacturer ?? suggestion.manufacturer,
    barcode: overrides.barcode ?? suggestion.barcode,
    sku: overrides.sku ?? suggestion.sku,
    category: overrides.category ?? suggestion.category,
    subCategory: overrides.subCategory ?? suggestion.subCategory,
    therapeuticClass: overrides.therapeuticClass ?? suggestion.therapeuticClass,
    schedule: overrides.schedule ?? suggestion.schedule,
    formulation: overrides.formulation ?? suggestion.formulation,
    packSize: overrides.packSize ?? suggestion.packSize,
    unitsPerPack: overrides.unitsPerPack ?? suggestion.unitsPerPack,
    unitOfMeasure: overrides.unitOfMeasure ?? suggestion.unitOfMeasure,
    strength: overrides.strength ?? suggestion.strength,
    dosageForm: overrides.dosageForm ?? suggestion.dosageForm,
    costPrice: overrides.costPrice ?? suggestion.costPrice,
    mrp: overrides.mrp ?? suggestion.mrp,
    salePrice: overrides.salePrice ?? suggestion.salePrice,
    taxRate: overrides.taxRate ?? suggestion.taxRate,
    lowStockThreshold: overrides.lowStockThreshold ?? suggestion.lowStockThreshold,
    reorderLevel: overrides.reorderLevel ?? suggestion.reorderLevel,
    reorderQuantity: overrides.reorderQuantity ?? suggestion.reorderQuantity,
    storageCondition: overrides.storageCondition ?? suggestion.storageCondition,
    description: overrides.description ?? suggestion.description,
    uploadedBy: req.user._id,
  };

  // Upsert by name — case-insensitive — so a parallel bulk-upload that
  // already inserted the same name doesn't 11000 us. We re-use the
  // existing master entry instead of duplicating.
  await MasterMedicine.findOneAndUpdate(
    { medicineName: masterData.medicineName },
    { $setOnInsert: masterData },
    { upsert: true, collation: { locale: 'en', strength: 2 } }
  );

  suggestion.status = 'approved';
  suggestion.reviewedBy = req.user._id;
  suggestion.reviewedAt = new Date();
  await suggestion.save();

  await ActivityLog.create({
    storeId: null,
    userId: req.user._id,
    action: 'Medicine suggestion approved',
    module: 'medicine',
    details: `Approved "${masterData.medicineName}" → MasterMedicine (${suggestion.contributorCount} contributor store(s))`,
    entityType: 'MasterMedicine',
  }).catch(() => {});

  res.json({ success: true, data: suggestion });
});

// @desc    Reject a suggestion — keep the row for audit, mark rejected so
//          it stops showing in the pending queue. Optional reason saved.
// @route   PUT /api/superadmin/medicine-suggestions/:id/reject
//          body: { reason?: string }
exports.rejectMedicineSuggestion = asyncHandler(async (req, res) => {
  const suggestion = await MedicineSuggestion.findById(req.params.id);
  if (!suggestion) return res.status(404).json({ success: false, message: 'Suggestion not found' });
  if (suggestion.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Already ${suggestion.status}` });
  }

  suggestion.status = 'rejected';
  suggestion.reviewedBy = req.user._id;
  suggestion.reviewedAt = new Date();
  suggestion.rejectionReason = (req.body?.reason || '').trim() || undefined;
  await suggestion.save();

  await ActivityLog.create({
    storeId: null,
    userId: req.user._id,
    action: 'Medicine suggestion rejected',
    module: 'medicine',
    details: `Rejected "${suggestion.medicineName}"${suggestion.rejectionReason ? ` — ${suggestion.rejectionReason}` : ''}`,
    entityType: 'MedicineSuggestion',
    entityId: suggestion._id,
  }).catch(() => {});

  res.json({ success: true, data: suggestion });
});

// @desc    Pending-count badge for the SuperAdmin sidebar.
// @route   GET /api/superadmin/medicine-suggestions/pending-count
exports.getMedicineSuggestionsPendingCount = asyncHandler(async (req, res) => {
  const count = await MedicineSuggestion.countDocuments({ status: 'pending' });
  res.json({ success: true, data: { count } });
});
