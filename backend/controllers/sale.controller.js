const { toObjectId } = require('../utils/objectId');
const Sale = require('../models/Sale');
const HeldSale = require('../models/HeldSale');
const SaleReturn = require('../models/SaleReturn');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Counter = require('../models/Counter');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../utils/errorHandler');
const { recalcStock } = require('./batch.controller');

// ──────────────────────────────────────
// CREATE SALE (Main POS billing)
// ──────────────────────────────────────
exports.createSale = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  if (!storeId) return res.status(400).json({ success: false, message: 'No store assigned to this user' });

  const {
    items, payments, customerId, customerName, customerPhone,
    overallDiscount = 0, overallDiscountPercent = 0,
    prescriptionImage, doctorName, doctorReg, patientName, patientAge, notes,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  // Generate invoice number
  let invoiceNo;
  try { invoiceNo = await Counter.getNext(storeId, 'sale', 'INV'); }
  catch (err) { return res.status(500).json({ success: false, message: 'Failed to generate invoice number: ' + err.message }); }

  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;
  let isControlledDrugSale = false;
  const processedItems = [];

  for (const item of items) {
    if (!item.medicineId) continue;
    
    const medicine = await Medicine.findOne({ _id: item.medicineId, storeId });
    if (!medicine) {
      return res.status(400).json({ success: false, message: `Medicine not found: ${item.medicineName || item.medicineId}` });
    }

    if (['Schedule-H', 'Schedule-H1', 'Schedule-X'].includes(medicine.schedule)) {
      isControlledDrugSale = true;
    }

    // Find FEFO batch (nearest expiry first)
    let remainingQty = parseInt(item.quantity) || 1;
    let batchUsed = null;

    if (item.batchId) {
      const batch = await Batch.findOne({ _id: item.batchId, storeId, remainingQty: { $gt: 0 }, isExpired: false });
      if (batch) {
        const deduct = Math.min(remainingQty, batch.remainingQty);
        batch.remainingQty -= deduct;
        await batch.save();
        batchUsed = batch;
        remainingQty -= deduct;
      }
    }
    
    if (remainingQty > 0 && !item.batchId) {
      // FEFO — auto pick nearest expiry
      const batches = await Batch.find({
        storeId, medicineId: medicine._id, remainingQty: { $gt: 0 }, isExpired: false,
      }).sort({ expiryDate: 1 });

      for (const batch of batches) {
        if (remainingQty <= 0) break;
        const deduct = Math.min(remainingQty, batch.remainingQty);
        batch.remainingQty -= deduct;
        await batch.save();
        remainingQty -= deduct;
        if (!batchUsed) batchUsed = batch;
      }
    }

    if (remainingQty > 0) {
      // Check if store allows negative stock
      const Store = require('../models/Store');
      const store = await Store.findById(storeId);
      if (!store?.settings?.allowNegativeStock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${medicine.medicineName}. Need: ${item.quantity}, Available: ${(parseInt(item.quantity) || 1) - remainingQty}`,
        });
      }
    }

    // Calculate line totals
    const unitPrice = parseFloat(item.unitPrice) || medicine.salePrice || 0;
    const itemDiscount = parseFloat(item.discount) || 0;
    const taxRate = item.taxRate !== undefined ? parseFloat(item.taxRate) : (medicine.taxRate || 0);
    const qty = parseInt(item.quantity) || 1;
    const lineSubtotal = unitPrice * qty;
    const lineTax = (lineSubtotal - itemDiscount) * (taxRate / 100);
    const lineTotal = lineSubtotal - itemDiscount + lineTax;

    subtotal += lineSubtotal;
    taxTotal += lineTax;
    discountTotal += itemDiscount;

    processedItems.push({
      medicineId: medicine._id, medicineName: medicine.medicineName,
      genericName: medicine.genericName, batchId: batchUsed?._id,
      batchNumber: batchUsed?.batchNumber, expiryDate: batchUsed?.expiryDate,
      quantity: qty, unitPrice, costPrice: medicine.costPrice || 0,
      discount: itemDiscount, discountPercent: parseFloat(item.discountPercent) || 0,
      tax: lineTax, taxRate, lineTotal,
      schedule: medicine.schedule, requiresPrescription: medicine.requiresPrescription,
    });

    // Recalc stock
    try { await recalcStock(medicine._id, storeId); } catch {}
  }

  if (processedItems.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid items in cart' });
  }

  // Apply overall discount
  const afterItemDiscount = subtotal - discountTotal + taxTotal;
  const overallDiscountAmount = overallDiscountPercent > 0
    ? (afterItemDiscount * overallDiscountPercent / 100)
    : overallDiscount;

  const grandTotal = afterItemDiscount - overallDiscountAmount;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const netTotal = Math.round(grandTotal);

  // Process payments — handle NaN and missing amounts
  let totalPaid = 0;
  const processedPayments = [];
  if (payments && payments.length > 0) {
    for (const p of payments) {
      const amt = parseFloat(p.amount);
      // If amount is empty/NaN and it's the only/first payment, default to netTotal
      const finalAmt = isNaN(amt) || amt <= 0 ? (processedPayments.length === 0 ? netTotal : 0) : amt;
      if (finalAmt > 0) {
        processedPayments.push({ method: p.method || 'cash', amount: finalAmt, reference: p.reference || '' });
        totalPaid += finalAmt;
      }
    }
  }
  // If no valid payments, default to cash = netTotal
  if (processedPayments.length === 0) {
    processedPayments.push({ method: 'cash', amount: netTotal, reference: '' });
    totalPaid = netTotal;
  }

  const changeGiven = Math.max(0, totalPaid - netTotal);
  const balanceDue = Math.max(0, netTotal - totalPaid);

  const sale = await Sale.create({
    storeId,
    invoiceNo,
    customerId: customerId || null,
    customerName: customerName || 'Walk-in Customer',
    customerPhone,
    cashierId: req.user._id,
    cashierName: req.user.name,
    items: processedItems,
    subtotal,
    taxTotal,
    discountTotal: discountTotal + overallDiscountAmount,
    overallDiscount: overallDiscountAmount,
    overallDiscountPercent,
    grandTotal,
    roundOff,
    netTotal,
    payments: processedPayments,
    totalPaid,
    changeGiven,
    balanceDue,
    prescriptionImage,
    doctorName, doctorReg, patientName, patientAge,
    status: 'completed',
    isControlledDrugSale,
    notes,
  });

  await ActivityLog.create({
    storeId, userId: req.user._id,
    action: 'Sale completed',
    module: 'sale',
    details: `${invoiceNo} — Rs.${netTotal} — ${processedItems.length} items`,
    entityId: sale._id, entityType: 'Sale',
  });

  res.status(201).json({ success: true, data: sale });
});

// ──────────────────────────────────────
// GET SALES LIST
// ──────────────────────────────────────
exports.getSales = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { page = 1, limit = 25, status, search, dateFrom, dateTo, cashierId } = req.query;
  const filter = { storeId };

  if (status) filter.status = status;
  if (cashierId) filter.cashierId = cashierId;
  if (search) {
    filter.$or = [
      { invoiceNo: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ];
  }
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59');
  }

  const total = await Sale.countDocuments(filter);
  const sales = await Sale.find(filter)
    .select('invoiceNo customerName status netTotal totalPaid items payments createdAt cashierName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    success: true, data: sales,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
  });
});

// ──────────────────────────────────────
// GET SINGLE SALE (Receipt data)
// ──────────────────────────────────────
exports.getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, storeId: req.user.storeId })
    .populate('cashierId', 'name')
    .populate('customerId', 'name phone');

  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });

  // Get store info for receipt
  const Store = require('../models/Store');
  const store = await Store.findById(sale.storeId).select('storeName address phone drugLicenseNumber gstNumber settings');

  res.json({ success: true, data: { sale, store } });
});

// ──────────────────────────────────────
// VOID SALE
// ──────────────────────────────────────
exports.voidSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
  if (sale.status !== 'completed') {
    return res.status(400).json({ success: false, message: `Cannot void a ${sale.status} sale` });
  }

  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, message: 'Void reason required' });

  // Restore stock for all items
  for (const item of sale.items) {
    if (item.batchId) {
      await Batch.findByIdAndUpdate(item.batchId, { $inc: { remainingQty: item.quantity } });
    }
    await recalcStock(item.medicineId, sale.storeId);
  }

  sale.status = 'voided';
  sale.voidReason = reason;
  sale.voidedBy = req.user._id;
  sale.voidedAt = new Date();
  await sale.save();

  await ActivityLog.create({
    storeId: sale.storeId, userId: req.user._id,
    action: 'Sale voided', module: 'sale',
    details: `${sale.invoiceNo} voided — Reason: ${reason}`,
    entityId: sale._id, entityType: 'Sale',
  });

  res.json({ success: true, data: sale });
});

// ──────────────────────────────────────
// PROCESS RETURN
// ──────────────────────────────────────
exports.processReturn = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const sale = await Sale.findOne({ _id: req.params.id, storeId });
  if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
  if (!['completed', 'partial_return'].includes(sale.status)) {
    return res.status(400).json({ success: false, message: 'Cannot return items from this sale' });
  }

  const { items, reason, refundMethod = 'cash', notes } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'No items to return' });
  if (!reason) return res.status(400).json({ success: false, message: 'Return reason required' });

  const returnNo = await Counter.getNext(storeId, 'return', 'RET');
  let refundAmount = 0;
  const returnItems = [];

  for (const ri of items) {
    // Find in original sale
    const saleItem = sale.items.find(si =>
      si.medicineId.toString() === ri.medicineId && si.quantity >= ri.quantity
    );
    if (!saleItem) {
      return res.status(400).json({ success: false, message: `Invalid return item or quantity exceeds sold` });
    }

    const lineRefund = saleItem.unitPrice * ri.quantity;
    refundAmount += lineRefund;

    returnItems.push({
      medicineId: ri.medicineId,
      medicineName: saleItem.medicineName,
      batchId: saleItem.batchId,
      batchNumber: saleItem.batchNumber,
      quantity: ri.quantity,
      unitPrice: saleItem.unitPrice,
      lineTotal: lineRefund,
      restockBatch: ri.restockBatch !== false,
    });

    // Restore stock
    if (ri.restockBatch !== false && saleItem.batchId) {
      await Batch.findByIdAndUpdate(saleItem.batchId, { $inc: { remainingQty: ri.quantity } });
    }
    await recalcStock(ri.medicineId, storeId);
  }

  const saleReturn = await SaleReturn.create({
    storeId,
    saleId: sale._id,
    invoiceNo: sale.invoiceNo,
    returnNo,
    items: returnItems,
    refundAmount,
    refundMethod,
    reason,
    notes,
    processedBy: req.user._id,
    status: 'completed',
  });

  // Update sale
  sale.returnedAmount = (sale.returnedAmount || 0) + refundAmount;
  sale.hasReturns = true;
  // If all items returned, mark as returned
  const totalReturnedValue = sale.returnedAmount;
  if (totalReturnedValue >= sale.netTotal * 0.99) {
    sale.status = 'returned';
  } else {
    sale.status = 'partial_return';
  }
  await sale.save();

  await ActivityLog.create({
    storeId, userId: req.user._id,
    action: 'Return processed', module: 'sale',
    details: `${returnNo} for ${sale.invoiceNo} — Rs.${refundAmount}`,
    entityId: saleReturn._id, entityType: 'SaleReturn',
  });

  res.status(201).json({ success: true, data: saleReturn });
});

// ──────────────────────────────────────
// HOLD BILL
// ──────────────────────────────────────
exports.holdBill = asyncHandler(async (req, res) => {
  const { items, customerId, customerName, notes } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  const subtotal = items.reduce((sum, i) => sum + (i.lineTotal || i.unitPrice * i.quantity), 0);

  const held = await HeldSale.create({
    storeId: req.user.storeId,
    items,
    customerId, customerName,
    cashierId: req.user._id,
    cashierName: req.user.name,
    notes,
    subtotal,
  });

  res.status(201).json({ success: true, data: held });
});

// ──────────────────────────────────────
// GET HELD BILLS
// ──────────────────────────────────────
exports.getHeldBills = asyncHandler(async (req, res) => {
  const held = await HeldSale.find({
    storeId: req.user.storeId,
    expiresAt: { $gte: new Date() },
  }).sort({ createdAt: -1 });

  res.json({ success: true, data: held, count: held.length });
});

// ──────────────────────────────────────
// RESUME HELD BILL (delete from held)
// ──────────────────────────────────────
exports.resumeHeldBill = asyncHandler(async (req, res) => {
  const held = await HeldSale.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!held) return res.status(404).json({ success: false, message: 'Held bill not found' });

  const data = held.toObject();
  await HeldSale.findByIdAndDelete(held._id);

  res.json({ success: true, data });
});

// ──────────────────────────────────────
// DELETE HELD BILL
// ──────────────────────────────────────
exports.deleteHeldBill = asyncHandler(async (req, res) => {
  await HeldSale.findOneAndDelete({ _id: req.params.id, storeId: req.user.storeId });
  res.json({ success: true, message: 'Held bill deleted' });
});

// ──────────────────────────────────────
// TODAY'S SALES SUMMARY
// ──────────────────────────────────────
exports.getTodaySummary = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const mongoose = require('mongoose');
  const sid = toObjectId(storeId);

  const [summary, paymentBreakdown, topItems] = await Promise.all([
    Sale.aggregate([
      { $match: { storeId: sid, createdAt: { $gte: today, $lt: tomorrow }, status: { $in: ['completed', 'partial_return'] } } },
      { $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$netTotal' },
        totalTax: { $sum: '$taxTotal' },
        totalDiscount: { $sum: '$discountTotal' },
        totalItems: { $sum: { $size: '$items' } },
        avgBillValue: { $avg: '$netTotal' },
      }},
    ]),
    Sale.aggregate([
      { $match: { storeId: sid, createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' } },
      { $unwind: '$payments' },
      { $group: { _id: '$payments.method', total: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Sale.aggregate([
      { $match: { storeId: sid, createdAt: { $gte: today, $lt: tomorrow }, status: { $in: ['completed', 'partial_return'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.medicineName', totalQty: { $sum: '$items.quantity' }, totalValue: { $sum: '$items.lineTotal' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      summary: summary[0] || { totalSales: 0, totalRevenue: 0, totalTax: 0, totalDiscount: 0, totalItems: 0, avgBillValue: 0 },
      paymentBreakdown,
      topItems,
    },
  });
});

// ──────────────────────────────────────
// GET RETURNS LIST
// ──────────────────────────────────────
exports.getReturns = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const filter = { storeId: req.user.storeId };
  const total = await SaleReturn.countDocuments(filter);
  const returns = await SaleReturn.find(filter)
    .populate('processedBy', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ success: true, data: returns, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});
