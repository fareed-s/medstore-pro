const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const GRN = require('../models/GRN');
const SupplierPayment = require('../models/SupplierPayment');
const PurchaseReturn = require('../models/PurchaseReturn');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Counter = require('../models/Counter');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../utils/errorHandler');
const { recalcStock } = require('./batch.controller');

// ═══════════════════════════════
// SUPPLIERS
// ═══════════════════════════════
exports.getSuppliers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 25 } = req.query;
  const filter = { storeId: req.user.storeId, isActive: true };
  if (search) {
    filter.$or = [
      { supplierName: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  const total = await Supplier.countDocuments(filter);
  const suppliers = await Supplier.find(filter).sort({ supplierName: 1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: suppliers, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
});

exports.getSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
  res.json({ success: true, data: supplier });
});

exports.createSupplier = asyncHandler(async (req, res) => {
  const data = { ...req.body, storeId: req.user.storeId };
  const supplier = await Supplier.create(data);
  res.status(201).json({ success: true, data: supplier });
});

exports.updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, storeId: req.user.storeId },
    req.body, { new: true, runValidators: true }
  );
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
  res.json({ success: true, data: supplier });
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, storeId: req.user.storeId },
    { isActive: false }, { new: true }
  );
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
  res.json({ success: true, message: 'Supplier deactivated' });
});

// ═══════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════
exports.getPurchaseOrders = asyncHandler(async (req, res) => {
  const { status, supplierId, page = 1, limit = 25 } = req.query;
  const filter = { storeId: req.user.storeId };
  if (status) filter.status = status;
  if (supplierId) filter.supplierId = supplierId;

  const total = await PurchaseOrder.countDocuments(filter);
  const orders = await PurchaseOrder.find(filter)
    .populate('supplierId', 'supplierName companyName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: orders, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
});

exports.getPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, storeId: req.user.storeId })
    .populate('supplierId').populate('createdBy', 'name').populate('approvedBy', 'name');
  if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
  res.json({ success: true, data: po });
});

exports.createPurchaseOrder = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { supplierId, items, expectedDelivery, notes, shippingCost = 0 } = req.body;

  const supplier = await Supplier.findOne({ _id: supplierId, storeId });
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

  const poNumber = await Counter.getNext(storeId, 'po', 'PO');
  let subtotal = 0, taxTotal = 0, discountTotal = 0;
  const processedItems = [];

  for (const item of items) {
    const med = await Medicine.findOne({ _id: item.medicineId, storeId });
    if (!med) continue;
    const lineSubtotal = item.unitCost * item.quantity;
    const lineTax = lineSubtotal * ((item.taxRate || 0) / 100);
    const lineTotal = lineSubtotal + lineTax - (item.discount || 0);
    subtotal += lineSubtotal;
    taxTotal += lineTax;
    discountTotal += (item.discount || 0);
    processedItems.push({
      medicineId: med._id, medicineName: med.medicineName, genericName: med.genericName,
      quantity: item.quantity, unitCost: item.unitCost, discount: item.discount || 0,
      tax: lineTax, taxRate: item.taxRate || 0, lineTotal, notes: item.notes,
    });
  }

  const po = await PurchaseOrder.create({
    storeId, poNumber, supplierId, supplierName: supplier.supplierName,
    items: processedItems, subtotal, taxTotal, discountTotal, shippingCost,
    grandTotal: subtotal + taxTotal - discountTotal + shippingCost,
    expectedDelivery, notes, createdBy: req.user._id, status: 'draft',
  });

  await ActivityLog.create({ storeId, userId: req.user._id, action: 'PO created', module: 'purchase', details: `${poNumber} — ${supplier.supplierName}`, entityId: po._id, entityType: 'PurchaseOrder' });
  res.status(201).json({ success: true, data: po });
});

exports.updatePurchaseOrder = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
  if (!['draft', 'sent'].includes(po.status)) return res.status(400).json({ success: false, message: 'Cannot edit PO in current status' });

  const { items, expectedDelivery, notes, shippingCost } = req.body;
  if (items) {
    let subtotal = 0, taxTotal = 0, discountTotal = 0;
    po.items = [];
    for (const item of items) {
      const lineSubtotal = item.unitCost * item.quantity;
      const lineTax = lineSubtotal * ((item.taxRate || 0) / 100);
      const lineTotal = lineSubtotal + lineTax - (item.discount || 0);
      subtotal += lineSubtotal; taxTotal += lineTax; discountTotal += (item.discount || 0);
      po.items.push({ medicineId: item.medicineId, medicineName: item.medicineName, genericName: item.genericName, quantity: item.quantity, unitCost: item.unitCost, discount: item.discount || 0, tax: lineTax, taxRate: item.taxRate || 0, lineTotal });
    }
    po.subtotal = subtotal; po.taxTotal = taxTotal; po.discountTotal = discountTotal;
    po.grandTotal = subtotal + taxTotal - discountTotal + (shippingCost || po.shippingCost);
  }
  if (expectedDelivery) po.expectedDelivery = expectedDelivery;
  if (notes !== undefined) po.notes = notes;
  if (shippingCost !== undefined) po.shippingCost = shippingCost;
  await po.save();
  res.json({ success: true, data: po });
});

exports.sendPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
  po.status = 'sent'; po.sentAt = new Date();
  await po.save();
  res.json({ success: true, data: po });
});

exports.cancelPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
  if (po.status === 'received') return res.status(400).json({ success: false, message: 'Cannot cancel received PO' });
  po.status = 'cancelled'; po.cancelledAt = new Date(); po.cancelReason = req.body.reason || '';
  await po.save();
  res.json({ success: true, data: po });
});

// ═══════════════════════════════
// GRN — GOODS RECEIVED NOTE
// ═══════════════════════════════
exports.createGRN = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { poId, supplierId, items, supplierInvoiceNo, supplierInvoiceDate, shippingCost = 0, otherCharges = 0, notes } = req.body;

  const supplier = await Supplier.findOne({ _id: supplierId, storeId });
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

  const grnNumber = await Counter.getNext(storeId, 'grn', 'GRN');
  let subtotal = 0, taxTotal = 0;
  const processedItems = [];

  for (const item of items) {
    const medicine = await Medicine.findOne({ _id: item.medicineId, storeId });
    if (!medicine) continue;

    const receivedQty = parseInt(item.receivedQty) || 0;
    const freeQty = parseInt(item.freeQty) || 0;
    const totalQty = receivedQty + freeQty;
    if (totalQty <= 0) continue;

    const lineTax = (item.unitCost * receivedQty) * ((item.taxRate || 0) / 100);
    const lineTotal = (item.unitCost * receivedQty) + lineTax;
    subtotal += item.unitCost * receivedQty;
    taxTotal += lineTax;

    // Create batch
    const batch = await Batch.create({
      storeId, medicineId: medicine._id, batchNumber: item.batchNumber,
      expiryDate: new Date(item.expiryDate), manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : undefined,
      quantity: totalQty, remainingQty: totalQty,
      costPrice: item.unitCost, salePrice: item.salePrice || medicine.salePrice,
      mrp: item.mrp || medicine.mrp, supplierId: supplier._id,
      addedBy: req.user._id,
    });

    // Update medicine prices if changed
    if (item.unitCost) medicine.costPrice = item.unitCost;
    if (item.salePrice) medicine.salePrice = item.salePrice;
    if (item.mrp) medicine.mrp = item.mrp;
    await medicine.save();
    await recalcStock(medicine._id, storeId);

    processedItems.push({
      medicineId: medicine._id, medicineName: medicine.medicineName,
      orderedQty: item.orderedQty || 0, receivedQty, freeQty,
      damagedQty: item.damagedQty || 0, shortQty: item.shortQty || 0,
      batchNumber: item.batchNumber, expiryDate: new Date(item.expiryDate),
      manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : undefined,
      unitCost: item.unitCost, mrp: item.mrp || medicine.mrp,
      salePrice: item.salePrice || medicine.salePrice,
      tax: lineTax, lineTotal, batchId: batch._id,
    });
  }

  const totalCost = subtotal + taxTotal + shippingCost + otherCharges;

  const grn = await GRN.create({
    storeId, grnNumber, poId: poId || undefined, poNumber: poId ? (await PurchaseOrder.findById(poId))?.poNumber : undefined,
    supplierId, supplierName: supplier.supplierName,
    supplierInvoiceNo, supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : undefined,
    items: processedItems, subtotal, taxTotal, shippingCost, otherCharges, totalCost,
    receivedBy: req.user._id, status: 'completed',
    notes,
  });

  // Update PO status
  if (poId) {
    const po = await PurchaseOrder.findById(poId);
    if (po) {
      const allReceived = po.items.every(pi => {
        const grnItem = processedItems.find(gi => gi.medicineId.toString() === pi.medicineId.toString());
        return grnItem && (pi.receivedQty + (grnItem.receivedQty || 0)) >= pi.quantity;
      });
      po.status = allReceived ? 'received' : 'partial';
      for (const pi of po.items) {
        const gi = processedItems.find(g => g.medicineId.toString() === pi.medicineId.toString());
        if (gi) pi.receivedQty = (pi.receivedQty || 0) + gi.receivedQty;
      }
      await po.save();
    }
  }

  // Update supplier balance
  supplier.currentBalance += totalCost;
  supplier.totalPurchases += totalCost;
  await supplier.save();

  await ActivityLog.create({ storeId, userId: req.user._id, action: 'GRN created', module: 'purchase', details: `${grnNumber} — ${supplier.supplierName} — Rs.${totalCost}`, entityId: grn._id, entityType: 'GRN' });
  res.status(201).json({ success: true, data: grn });
});

exports.getGRNs = asyncHandler(async (req, res) => {
  const { supplierId, page = 1, limit = 25 } = req.query;
  const filter = { storeId: req.user.storeId };
  if (supplierId) filter.supplierId = supplierId;
  const total = await GRN.countDocuments(filter);
  const grns = await GRN.find(filter).populate('supplierId', 'supplierName').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: grns, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
});

exports.getGRN = asyncHandler(async (req, res) => {
  const grn = await GRN.findOne({ _id: req.params.id, storeId: req.user.storeId })
    .populate('supplierId').populate('receivedBy', 'name');
  if (!grn) return res.status(404).json({ success: false, message: 'GRN not found' });
  res.json({ success: true, data: grn });
});

// ═══════════════════════════════
// SUPPLIER PAYMENTS
// ═══════════════════════════════
exports.recordPayment = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { supplierId, amount, method, reference, chequeNumber, chequeDate, notes } = req.body;

  const supplier = await Supplier.findOne({ _id: supplierId, storeId });
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

  const payment = await SupplierPayment.create({
    storeId, supplierId, supplierName: supplier.supplierName,
    amount, method, reference, chequeNumber, chequeDate: chequeDate ? new Date(chequeDate) : undefined,
    notes, paidBy: req.user._id,
  });

  supplier.currentBalance -= amount;
  supplier.totalPayments += amount;
  await supplier.save();

  res.status(201).json({ success: true, data: payment, newBalance: supplier.currentBalance });
});

exports.getPayments = asyncHandler(async (req, res) => {
  const { supplierId, page = 1, limit = 25 } = req.query;
  const filter = { storeId: req.user.storeId };
  if (supplierId) filter.supplierId = supplierId;
  const total = await SupplierPayment.countDocuments(filter);
  const payments = await SupplierPayment.find(filter).populate('paidBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: payments, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

// ═══════════════════════════════
// SUPPLIER LEDGER
// ═══════════════════════════════
exports.getSupplierLedger = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const supplierId = req.params.id;
  const { dateFrom, dateTo } = req.query;

  const supplier = await Supplier.findOne({ _id: supplierId, storeId });
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

  const dateFilter = {};
  if (dateFrom) dateFilter.$gte = new Date(dateFrom);
  if (dateTo) dateFilter.$lte = new Date(dateTo + 'T23:59:59');

  const grnFilter = { storeId, supplierId: supplier._id };
  const payFilter = { storeId, supplierId: supplier._id };
  if (dateFrom || dateTo) { grnFilter.createdAt = dateFilter; payFilter.createdAt = dateFilter; }

  const [grns, payments, returns] = await Promise.all([
    GRN.find(grnFilter).select('grnNumber totalCost supplierInvoiceNo createdAt').sort({ createdAt: 1 }),
    SupplierPayment.find(payFilter).select('amount method reference chequeNumber createdAt').sort({ createdAt: 1 }),
    PurchaseReturn.find({ storeId, supplierId: supplier._id, ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}) }).select('returnNo totalAmount createdAt').sort({ createdAt: 1 }),
  ]);

  // Build ledger entries
  const entries = [];
  grns.forEach(g => entries.push({ date: g.createdAt, type: 'purchase', ref: g.grnNumber, invoiceNo: g.supplierInvoiceNo, debit: g.totalCost, credit: 0 }));
  payments.forEach(p => entries.push({ date: p.createdAt, type: 'payment', ref: p.reference || p.chequeNumber || '', method: p.method, debit: 0, credit: p.amount }));
  returns.forEach(r => entries.push({ date: r.createdAt, type: 'return', ref: r.returnNo, debit: 0, credit: r.totalAmount }));

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Running balance
  let balance = 0;
  entries.forEach(e => { balance += e.debit - e.credit; e.balance = balance; });

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  res.json({
    success: true,
    data: {
      supplier, entries, totalDebit, totalCredit,
      currentBalance: supplier.currentBalance,
    },
  });
});

// ═══════════════════════════════
// PURCHASE RETURNS
// ═══════════════════════════════
exports.createPurchaseReturn = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { supplierId, items, reason, notes, grnId } = req.body;

  const supplier = await Supplier.findOne({ _id: supplierId, storeId });
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

  const returnNo = await Counter.getNext(storeId, 'pr', 'PR');
  let totalAmount = 0;
  const processedItems = [];

  for (const item of items) {
    const lineTotal = item.unitCost * item.quantity;
    totalAmount += lineTotal;

    // Reduce batch stock
    if (item.batchId) {
      const batch = await Batch.findById(item.batchId);
      if (batch) {
        batch.remainingQty = Math.max(0, batch.remainingQty - item.quantity);
        await batch.save();
      }
    }
    await recalcStock(item.medicineId, storeId);

    processedItems.push({
      medicineId: item.medicineId, medicineName: item.medicineName,
      batchId: item.batchId, batchNumber: item.batchNumber,
      quantity: item.quantity, unitCost: item.unitCost, lineTotal,
      reason: item.reason || reason,
    });
  }

  const pr = await PurchaseReturn.create({
    storeId, returnNo, supplierId, supplierName: supplier.supplierName,
    grnId, items: processedItems, totalAmount, reason, notes,
    processedBy: req.user._id,
  });

  // Adjust supplier balance
  supplier.currentBalance -= totalAmount;
  await supplier.save();

  res.status(201).json({ success: true, data: pr });
});

exports.getPurchaseReturns = asyncHandler(async (req, res) => {
  const filter = { storeId: req.user.storeId };
  if (req.query.supplierId) filter.supplierId = req.query.supplierId;
  const returns = await PurchaseReturn.find(filter).populate('processedBy', 'name').sort({ createdAt: -1 });
  res.json({ success: true, data: returns });
});

// ═══════════════════════════════
// SUPPLIER OUTSTANDING / AGING
// ═══════════════════════════════
exports.getSupplierOutstanding = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const suppliers = await Supplier.find({ storeId, isActive: true, currentBalance: { $gt: 0 } })
    .select('supplierName companyName currentBalance paymentTerms phone')
    .sort({ currentBalance: -1 });

  const totalOutstanding = suppliers.reduce((s, sup) => s + sup.currentBalance, 0);
  res.json({ success: true, data: { suppliers, totalOutstanding, count: suppliers.length } });
});

// ═══════════════════════════════
// PRICE HISTORY
// ═══════════════════════════════
exports.getPriceHistory = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const { medicineId } = req.params;

  const grns = await GRN.find({ storeId, 'items.medicineId': medicineId })
    .select('grnNumber supplierName createdAt items')
    .sort({ createdAt: -1 })
    .limit(20);

  const history = [];
  grns.forEach(grn => {
    const item = grn.items.find(i => i.medicineId.toString() === medicineId);
    if (item) {
      history.push({
        date: grn.createdAt, grnNumber: grn.grnNumber, supplier: grn.supplierName,
        unitCost: item.unitCost, mrp: item.mrp, quantity: item.receivedQty,
      });
    }
  });

  res.json({ success: true, data: history });
});
