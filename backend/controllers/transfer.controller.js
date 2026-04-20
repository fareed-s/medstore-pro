const StockTransfer = require('../models/StockTransfer');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const { asyncHandler } = require('../utils/errorHandler');
const Counter = require('../models/Counter');

exports.getTransfers = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 25 } = req.query;
  const filter = { $or: [{ fromStore: req.user.storeId }, { toStore: req.user.storeId }] };
  if (status) filter.status = status;
  const total = await StockTransfer.countDocuments(filter);
  const data = await StockTransfer.find(filter).populate('fromStore', 'storeName').populate('toStore', 'storeName')
    .populate('requestedBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

exports.createTransfer = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const transferNo = await Counter.getNext(storeId, 'transfer', 'TRF');
  const { toStore, items, notes } = req.body;

  const processedItems = [];
  for (const item of items) {
    const med = await Medicine.findById(item.medicineId);
    processedItems.push({
      medicineId: item.medicineId, medicineName: med?.medicineName || item.medicineName,
      genericName: med?.genericName, batchId: item.batchId, batchNumber: item.batchNumber,
      quantity: item.quantity, costPrice: med?.costPrice || 0,
    });
  }

  const transfer = await StockTransfer.create({
    transferNo, fromStore: storeId, toStore, items: processedItems,
    totalItems: processedItems.length, totalQuantity: processedItems.reduce((s, i) => s + i.quantity, 0),
    requestedBy: req.user._id, status: 'pending', notes,
  });
  res.status(201).json({ success: true, data: transfer });
});

exports.approveTransfer = asyncHandler(async (req, res) => {
  const transfer = await StockTransfer.findById(req.params.id);
  if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });
  if (transfer.toStore.toString() !== req.user.storeId?.toString()) return res.status(403).json({ success: false, message: 'Only receiving store can approve' });

  transfer.status = 'approved';
  transfer.approvedBy = req.user._id;
  transfer.approvedAt = new Date();
  await transfer.save();
  res.json({ success: true, data: transfer });
});

exports.completeTransfer = asyncHandler(async (req, res) => {
  const transfer = await StockTransfer.findById(req.params.id);
  if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });

  // Deduct from source store
  for (const item of transfer.items) {
    if (item.batchId) {
      const batch = await Batch.findById(item.batchId);
      if (batch) { batch.remainingQty = Math.max(0, batch.remainingQty - item.quantity); await batch.save(); }
    }
    const srcMed = await Medicine.findOne({ _id: item.medicineId, storeId: transfer.fromStore });
    if (srcMed) { srcMed.currentStock = Math.max(0, srcMed.currentStock - item.quantity); await srcMed.save(); }
  }

  transfer.status = 'completed';
  transfer.completedAt = new Date();
  await transfer.save();
  res.json({ success: true, data: transfer });
});

exports.rejectTransfer = asyncHandler(async (req, res) => {
  const transfer = await StockTransfer.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: req.body.reason }, { new: true });
  res.json({ success: true, data: transfer });
});
