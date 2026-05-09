const { asyncHandler } = require('../utils/errorHandler');
const ControlledMedicine = require('../models/ControlledMedicine');
const ControlledStockAdjustment = require('../models/ControlledStockAdjustment');
const ADJUSTMENT_REASONS = ControlledStockAdjustment.REASONS;

// All routes mounted under /api/controlled and gated by `requireUnlocked`,
// so by the time we get here:
//   - req.user is the authenticated user
//   - they have a valid module-token for THIS store
//   - the module is enabled and not in inspection mode
//   - the user is in the allow-list (or is StoreAdmin/SuperAdmin)
// That guard is shared, so every handler here can assume scope.

// Helper — every read/write below is scoped to the store. SuperAdmin has no
// storeId; in practice they don't unlock the module per store anyway.
const scope = (req) => ({ storeId: req.user.storeId });

// @desc    List controlled medicines for the current store
// @route   GET /api/controlled/medicines
exports.list = asyncHandler(async (req, res) => {
  const { search = '', schedule, lowStock } = req.query;

  const filter = { ...scope(req) };
  if (schedule) filter.schedule = schedule;
  if (search) {
    filter.$or = [
      { medicineName: { $regex: search, $options: 'i' } },
      { genericName: { $regex: search, $options: 'i' } },
      { manufacturer: { $regex: search, $options: 'i' } },
    ];
  }

  let items = await ControlledMedicine.find(filter)
    .sort({ medicineName: 1 })
    .lean();

  if (lowStock === 'true') {
    items = items.filter((m) => m.currentStock <= (m.lowStockThreshold || 0));
  }

  res.json({ success: true, data: items, count: items.length });
});

// @desc    Get one
// @route   GET /api/controlled/medicines/:id
exports.getOne = asyncHandler(async (req, res) => {
  const item = await ControlledMedicine.findOne({ _id: req.params.id, ...scope(req) }).lean();
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: item });
});

// @desc    Create — initial batch can be sent inline; if quantity > 0 it's
//          recorded as the first batch.
// @route   POST /api/controlled/medicines
//          body: { medicineName, schedule, ... defaultCostPrice, defaultMrp, defaultSalePrice,
//                  initialBatch?: { batchNumber, expiryDate, quantity, costPrice, mrp, salePrice } }
exports.create = asyncHandler(async (req, res) => {
  const {
    medicineName, genericName, manufacturer, schedule,
    narcoticLicenseNumber, category, strength, unitOfMeasure, packSize,
    defaultCostPrice = 0, defaultMrp = 0, defaultSalePrice = 0,
    maxQuantityPerSale = 0, requiresPrescription = true,
    lowStockThreshold = 5, storageCondition, notes,
    initialBatch,
  } = req.body || {};

  if (!medicineName || !schedule) {
    return res.status(400).json({ success: false, message: 'medicineName and schedule are required' });
  }

  const doc = new ControlledMedicine({
    ...scope(req),
    medicineName: medicineName.trim(),
    genericName, manufacturer, schedule,
    narcoticLicenseNumber, category, strength, unitOfMeasure, packSize,
    defaultCostPrice, defaultMrp, defaultSalePrice,
    maxQuantityPerSale, requiresPrescription,
    lowStockThreshold, storageCondition, notes,
    addedBy: req.user._id,
  });

  if (initialBatch && initialBatch.batchNumber && initialBatch.expiryDate) {
    doc.batches.push({
      batchNumber: initialBatch.batchNumber,
      expiryDate: initialBatch.expiryDate,
      quantity: Number(initialBatch.quantity) || 0,
      costPrice: Number(initialBatch.costPrice) || defaultCostPrice,
      mrp: Number(initialBatch.mrp) || defaultMrp,
      salePrice: Number(initialBatch.salePrice) || defaultSalePrice,
      source: initialBatch.source || '',
      addedBy: req.user._id,
    });
  }

  await doc.save();
  res.status(201).json({ success: true, data: doc });
});

// @desc    Update top-level fields. Batch operations have their own routes.
// @route   PUT /api/controlled/medicines/:id
exports.update = asyncHandler(async (req, res) => {
  // Whitelist editable fields — never let `batches` slip through here, that
  // would silently zero out stock.
  const editable = [
    'medicineName', 'genericName', 'manufacturer', 'schedule', 'narcoticLicenseNumber',
    'category', 'strength', 'unitOfMeasure', 'packSize',
    'defaultCostPrice', 'defaultMrp', 'defaultSalePrice',
    'maxQuantityPerSale', 'requiresPrescription',
    'lowStockThreshold', 'storageCondition', 'notes', 'isActive',
  ];
  const updates = {};
  for (const k of editable) if (k in (req.body || {})) updates[k] = req.body[k];

  const item = await ControlledMedicine.findOneAndUpdate(
    { _id: req.params.id, ...scope(req) },
    updates,
    { new: true, runValidators: true }
  );
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: item });
});

// @desc    Add a new batch (stock-in). Prefilled prices come from the
//          medicine's defaults but can be overridden per batch.
// @route   POST /api/controlled/medicines/:id/batches
exports.addBatch = asyncHandler(async (req, res) => {
  const { batchNumber, expiryDate, quantity, costPrice, mrp, salePrice, source } = req.body || {};
  if (!batchNumber || !expiryDate || !quantity) {
    return res.status(400).json({ success: false, message: 'batchNumber, expiryDate and quantity are required' });
  }

  const item = await ControlledMedicine.findOne({ _id: req.params.id, ...scope(req) });
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });

  item.batches.push({
    batchNumber: String(batchNumber).trim(),
    expiryDate: new Date(expiryDate),
    quantity: Number(quantity),
    costPrice: Number(costPrice) || item.defaultCostPrice,
    mrp: Number(mrp) || item.defaultMrp,
    salePrice: Number(salePrice) || item.defaultSalePrice,
    source: source || '',
    addedBy: req.user._id,
  });
  await item.save();   // pre-save recomputes currentStock

  res.status(201).json({ success: true, data: item });
});

// @desc    Edit non-quantity batch fields (batch #, expiry, prices, source).
//          QUANTITY is intentionally NOT editable here — for regulated
//          drugs every quantity change must go through `adjustBatch` so a
//          reason + audit row are recorded. This route is only for fixing
//          typos in batch metadata.
// @route   PUT /api/controlled/medicines/:id/batches/:batchId
exports.updateBatch = asyncHandler(async (req, res) => {
  const item = await ControlledMedicine.findOne({ _id: req.params.id, ...scope(req) });
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });

  const batch = item.batches.id(req.params.batchId);
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

  // Whitelist — note `quantity` deliberately omitted.
  const editable = ['batchNumber', 'expiryDate', 'costPrice', 'mrp', 'salePrice', 'source'];
  for (const k of editable) {
    if (k in (req.body || {})) {
      batch[k] = k === 'expiryDate' ? new Date(req.body[k]) : req.body[k];
    }
  }
  await item.save();
  res.json({ success: true, data: item });
});

// @desc    Adjust a batch's stock quantity with a mandatory reason. Writes
//          an immutable audit row in ControlledStockAdjustment.
// @route   POST /api/controlled/medicines/:id/batches/:batchId/adjust
//          body: { newQuantity, reason, notes? }
exports.adjustBatch = asyncHandler(async (req, res) => {
  const { newQuantity, reason, notes } = req.body || {};

  if (newQuantity === undefined || newQuantity === null || newQuantity === '') {
    return res.status(400).json({ success: false, message: 'newQuantity is required' });
  }
  const newQty = Number(newQuantity);
  if (!Number.isFinite(newQty) || newQty < 0) {
    return res.status(400).json({ success: false, message: 'newQuantity must be a non-negative number' });
  }
  if (!reason || !ADJUSTMENT_REASONS.includes(reason)) {
    return res.status(400).json({
      success: false,
      message: `reason is required and must be one of: ${ADJUSTMENT_REASONS.join(', ')}`,
    });
  }
  // "Other" without a note is too vague for an audit trail.
  if (reason === 'other' && !notes?.trim()) {
    return res.status(400).json({ success: false, message: 'Notes are required when reason is "other"' });
  }

  const item = await ControlledMedicine.findOne({ _id: req.params.id, ...scope(req) });
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });

  const batch = item.batches.id(req.params.batchId);
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

  const previousQuantity = Number(batch.quantity) || 0;
  const delta = newQty - previousQuantity;
  if (delta === 0) {
    return res.status(400).json({ success: false, message: 'New quantity is identical to the current quantity' });
  }

  // Apply the change atomically — write the adjustment row first so even if
  // the medicine save fails we still have evidence of the attempt. We then
  // mutate the batch and save the medicine.
  await ControlledStockAdjustment.create({
    ...scope(req),
    medicineId: item._id,
    batchId: batch._id,
    medicineName: item.medicineName,
    schedule: item.schedule,
    batchNumber: batch.batchNumber,
    previousQuantity,
    newQuantity: newQty,
    delta,
    reason,
    notes: notes?.trim() || '',
    adjustedBy: req.user._id,
    adjustedByName: req.user.name,
    adjustedByRole: req.user.role,
  });

  batch.quantity = newQty;
  await item.save();   // recomputes currentStock

  res.json({ success: true, data: item });
});

// @desc    List adjustment history for one medicine (newest first).
// @route   GET /api/controlled/medicines/:id/adjustments
exports.listAdjustments = asyncHandler(async (req, res) => {
  const adjustments = await ControlledStockAdjustment.find({
    medicineId: req.params.id,
    ...scope(req),
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ success: true, data: adjustments });
});

// @desc    Remove a batch entirely. Use with caution — this is a hard delete
//          and should be reserved for genuine data-entry mistakes.
// @route   DELETE /api/controlled/medicines/:id/batches/:batchId
exports.removeBatch = asyncHandler(async (req, res) => {
  const item = await ControlledMedicine.findOne({ _id: req.params.id, ...scope(req) });
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });

  const batch = item.batches.id(req.params.batchId);
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

  batch.deleteOne();
  await item.save();
  res.json({ success: true, data: item });
});

// @desc    Soft-delete a medicine (set isActive=false). Hard delete is risky —
//          historical sales reference it. We never hard-delete here.
// @route   DELETE /api/controlled/medicines/:id
exports.softDelete = asyncHandler(async (req, res) => {
  const item = await ControlledMedicine.findOneAndUpdate(
    { _id: req.params.id, ...scope(req) },
    { isActive: false },
    { new: true }
  );
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: item });
});
