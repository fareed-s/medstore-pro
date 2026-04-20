const { toObjectId } = require('../utils/objectId');
const ControlledDrugRegister = require('../models/ControlledDrugRegister');
const DrugLicense = require('../models/DrugLicense');
const ExpiryDestruction = require('../models/ExpiryDestruction');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Counter = require('../models/Counter');
const { asyncHandler } = require('../utils/errorHandler');
const { recalcStock } = require('./batch.controller');
const { addDays } = require('date-fns');
const mongoose = require('mongoose');

// ═══════════════════════════════════════
// CONTROLLED DRUG REGISTER
// ═══════════════════════════════════════

exports.getControlledDrugEntries = asyncHandler(async (req, res) => {
  const { schedule, medicineId, dateFrom, dateTo, patientName, page = 1, limit = 50 } = req.query;
  const filter = { storeId: req.user.storeId };
  if (schedule) filter.schedule = schedule;
  if (medicineId) filter.medicineId = medicineId;
  if (patientName) filter.patientName = { $regex: patientName, $options: 'i' };
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo + 'T23:59:59');
  }

  const total = await ControlledDrugRegister.countDocuments(filter);
  const entries = await ControlledDrugRegister.find(filter)
    .populate('recordedBy', 'name')
    .sort({ date: -1 })
    .skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: entries, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
});

exports.addControlledDrugEntry = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const data = { ...req.body, storeId, recordedBy: req.user._id };

  // Get current balance for this medicine
  const med = await Medicine.findById(data.medicineId);
  if (med && ['Schedule-H1', 'Schedule-X'].includes(data.schedule)) {
    // H1 and X require patient + doctor details
    if (!data.patientName) return res.status(400).json({ success: false, message: 'Patient name is mandatory for Schedule H1/X drugs' });
    if (!data.doctorName) return res.status(400).json({ success: false, message: 'Doctor name is mandatory for Schedule H1/X drugs' });
  }

  // Calculate running balance
  const lastEntry = await ControlledDrugRegister.findOne({
    storeId, medicineId: data.medicineId
  }).sort({ date: -1 });

  const prevBalance = lastEntry ? lastEntry.balanceAfter : (med?.currentStock || 0);
  data.balanceBefore = prevBalance;
  data.balanceAfter = data.direction === 'in' ? prevBalance + data.quantity : prevBalance - data.quantity;

  const entry = await ControlledDrugRegister.create(data);
  res.status(201).json({ success: true, data: entry });
});

// Admin correction (with audit trail)
exports.correctEntry = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const originalId = req.params.id;
  const original = await ControlledDrugRegister.findOne({ _id: originalId, storeId });
  if (!original) return res.status(404).json({ success: false, message: 'Entry not found' });

  const correction = await ControlledDrugRegister.create({
    ...req.body,
    storeId,
    medicineId: original.medicineId,
    medicineName: original.medicineName,
    genericName: original.genericName,
    schedule: original.schedule,
    isCorrection: true,
    correctionOf: original._id,
    correctionReason: req.body.correctionReason,
    correctedBy: req.user._id,
    recordedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: correction });
});

// Running balance report per medicine
exports.getControlledDrugBalance = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const sid = toObjectId(storeId);

  const medicines = await Medicine.find({
    storeId, isActive: true,
    schedule: { $in: ['Schedule-H', 'Schedule-H1', 'Schedule-X'] },
  }).select('medicineName genericName schedule currentStock').lean();

  for (const med of medicines) {
    const lastEntry = await ControlledDrugRegister.findOne({
      storeId, medicineId: med._id,
    }).sort({ date: -1 });
    med.registerBalance = lastEntry ? lastEntry.balanceAfter : med.currentStock;
    med.lastEntryDate = lastEntry?.date;
  }

  res.json({ success: true, data: medicines });
});

// Monthly narcotic report for inspector
exports.getNarcoticReport = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { month, year } = req.query;
  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year) || new Date().getFullYear();
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59);

  const entries = await ControlledDrugRegister.find({
    storeId,
    schedule: 'Schedule-X',
    date: { $gte: startDate, $lte: endDate },
  }).populate('recordedBy', 'name').sort({ date: 1 });

  // Group by medicine
  const grouped = {};
  entries.forEach(e => {
    const key = e.medicineId.toString();
    if (!grouped[key]) grouped[key] = { medicineName: e.medicineName, genericName: e.genericName, entries: [] };
    grouped[key].entries.push(e);
  });

  res.json({ success: true, data: { month: m, year: y, medicines: Object.values(grouped), totalEntries: entries.length } });
});

// ═══════════════════════════════════════
// DRUG LICENSE MANAGEMENT
// ═══════════════════════════════════════

exports.getDrugLicenses = asyncHandler(async (req, res) => {
  const licenses = await DrugLicense.find({ storeId: req.user.storeId, isActive: true })
    .populate('supplierId', 'supplierName')
    .sort({ expiryDate: 1 });

  // Update renewal status based on expiry
  const now = new Date();
  for (const dl of licenses) {
    if (dl.expiryDate < now) dl.renewalStatus = 'expired';
    else if (dl.expiryDate < addDays(now, 90)) dl.renewalStatus = 'expiring_soon';
    else dl.renewalStatus = 'active';
  }

  res.json({ success: true, data: licenses });
});

exports.createDrugLicense = asyncHandler(async (req, res) => {
  const dl = await DrugLicense.create({ ...req.body, storeId: req.user.storeId, addedBy: req.user._id });
  res.status(201).json({ success: true, data: dl });
});

exports.updateDrugLicense = asyncHandler(async (req, res) => {
  const dl = await DrugLicense.findOneAndUpdate(
    { _id: req.params.id, storeId: req.user.storeId }, req.body, { new: true }
  );
  if (!dl) return res.status(404).json({ success: false, message: 'License not found' });
  res.json({ success: true, data: dl });
});

exports.deleteDrugLicense = asyncHandler(async (req, res) => {
  await DrugLicense.findOneAndUpdate({ _id: req.params.id, storeId: req.user.storeId }, { isActive: false });
  res.json({ success: true, message: 'License deactivated' });
});

exports.getDLExpiryAlerts = asyncHandler(async (req, res) => {
  const now = new Date();
  const alerts90 = addDays(now, 90);

  const expiring = await DrugLicense.find({
    storeId: req.user.storeId, isActive: true,
    expiryDate: { $lte: alerts90 },
  }).populate('supplierId', 'supplierName').sort({ expiryDate: 1 });

  const expired = expiring.filter(dl => dl.expiryDate < now);
  const within30 = expiring.filter(dl => dl.expiryDate >= now && dl.expiryDate <= addDays(now, 30));
  const within60 = expiring.filter(dl => dl.expiryDate > addDays(now, 30) && dl.expiryDate <= addDays(now, 60));
  const within90 = expiring.filter(dl => dl.expiryDate > addDays(now, 60) && dl.expiryDate <= alerts90);

  res.json({ success: true, data: { expired, within30, within60, within90, total: expiring.length } });
});

// ═══════════════════════════════════════
// EXPIRY DESTRUCTION REGISTER
// ═══════════════════════════════════════

exports.getDestructions = asyncHandler(async (req, res) => {
  const destructions = await ExpiryDestruction.find({ storeId: req.user.storeId })
    .populate('conductedBy', 'name').sort({ date: -1 });
  res.json({ success: true, data: destructions });
});

exports.createDestruction = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const destructionNo = await Counter.getNext(storeId, 'destruction', 'DES');
  const { items, destructionMethod, destructionLocation, witness1Name, witness1Designation, witness2Name, witness2Designation, notes } = req.body;

  let totalQuantity = 0, totalValue = 0;
  const processedItems = [];

  for (const item of items) {
    const med = await Medicine.findById(item.medicineId);
    const batch = item.batchId ? await Batch.findById(item.batchId) : null;
    const costPrice = batch?.costPrice || med?.costPrice || 0;
    const itemValue = item.quantity * costPrice;
    totalQuantity += item.quantity;
    totalValue += itemValue;

    // Remove from batch
    if (batch) {
      batch.remainingQty = Math.max(0, batch.remainingQty - item.quantity);
      batch.isExpired = true;
      await batch.save();
      await recalcStock(item.medicineId, storeId);
    }

    processedItems.push({
      medicineId: item.medicineId,
      medicineName: med?.medicineName || item.medicineName,
      genericName: med?.genericName,
      batchId: item.batchId,
      batchNumber: item.batchNumber || batch?.batchNumber,
      expiryDate: item.expiryDate || batch?.expiryDate,
      quantity: item.quantity,
      costPrice,
      totalValue: itemValue,
    });
  }

  const destruction = await ExpiryDestruction.create({
    storeId, destructionNo, items: processedItems,
    totalItems: processedItems.length, totalQuantity, totalValue,
    destructionMethod, destructionLocation,
    witness1Name, witness1Designation, witness2Name, witness2Designation,
    conductedBy: req.user._id, status: 'completed', notes,
  });

  res.status(201).json({ success: true, data: destruction });
});

exports.getDestruction = asyncHandler(async (req, res) => {
  const d = await ExpiryDestruction.findOne({ _id: req.params.id, storeId: req.user.storeId })
    .populate('conductedBy', 'name').populate('approvedBy', 'name');
  if (!d) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: d });
});

// ═══════════════════════════════════════
// COMPLIANCE DASHBOARD
// ═══════════════════════════════════════

exports.getComplianceDashboard = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const sid = toObjectId(storeId);
  const now = new Date();

  const [
    controlledMedicines,
    scheduleHCount,
    scheduleH1Count,
    scheduleXCount,
    recentEntries,
    dlExpiring,
    destructionCount,
  ] = await Promise.all([
    Medicine.countDocuments({ storeId, isActive: true, schedule: { $in: ['Schedule-H', 'Schedule-H1', 'Schedule-X'] } }),
    Medicine.countDocuments({ storeId, isActive: true, schedule: 'Schedule-H' }),
    Medicine.countDocuments({ storeId, isActive: true, schedule: 'Schedule-H1' }),
    Medicine.countDocuments({ storeId, isActive: true, schedule: 'Schedule-X' }),
    ControlledDrugRegister.countDocuments({ storeId, date: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } }),
    DrugLicense.countDocuments({ storeId, isActive: true, expiryDate: { $lte: addDays(now, 90) } }),
    ExpiryDestruction.countDocuments({ storeId }),
  ]);

  res.json({
    success: true,
    data: {
      controlledMedicines, scheduleHCount, scheduleH1Count, scheduleXCount,
      recentEntries, dlExpiring, destructionCount,
    },
  });
});
