const { toObjectId } = require('../utils/objectId');
const Sale = require('../models/Sale');
const SaleReturn = require('../models/SaleReturn');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const GRN = require('../models/GRN');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const ControlledDrugRegister = require('../models/ControlledDrugRegister');
const User = require('../models/User');
const { asyncHandler } = require('../utils/errorHandler');
const mongoose = require('mongoose');

const getSid = (storeId) => toObjectId(storeId);
const dateFilter = (dateFrom, dateTo, field = 'createdAt') => {
  const f = {};
  if (dateFrom) f[field] = { ...f[field], $gte: new Date(dateFrom) };
  if (dateTo) f[field] = { ...f[field], $lte: new Date(dateTo + 'T23:59:59') };
  return f;
};

// ═══════════════ SALES REPORTS ═══════════════

exports.salesSummary = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo, groupBy = 'day' } = req.query;
  const match = { storeId: sid, status: { $in: ['completed', 'partial_return'] }, ...dateFilter(dateFrom, dateTo) };

  const groupFormat = { day: '%Y-%m-%d', week: '%Y-W%V', month: '%Y-%m' };
  const data = await Sale.aggregate([
    { $match: match },
    { $group: {
      _id: { $dateToString: { format: groupFormat[groupBy] || groupFormat.day, date: '$createdAt' } },
      totalSales: { $sum: 1 }, revenue: { $sum: '$netTotal' },
      tax: { $sum: '$taxTotal' }, discount: { $sum: '$discountTotal' },
      items: { $sum: { $size: '$items' } },
    }},
    { $sort: { _id: 1 } },
  ]);
  const totals = data.reduce((s, d) => ({ sales: s.sales + d.totalSales, revenue: s.revenue + d.revenue, tax: s.tax + d.tax, discount: s.discount + d.discount }), { sales: 0, revenue: 0, tax: 0, discount: 0 });
  res.json({ success: true, data, totals });
});

exports.salesByProduct = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo, limit = 50 } = req.query;
  const match = { storeId: sid, status: { $in: ['completed', 'partial_return'] }, ...dateFilter(dateFrom, dateTo) };
  const data = await Sale.aggregate([
    { $match: match }, { $unwind: '$items' },
    { $group: { _id: { id: '$items.medicineId', name: '$items.medicineName', generic: '$items.genericName' }, totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.lineTotal' }, totalCost: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } }, salesCount: { $sum: 1 } }},
    { $addFields: { profit: { $subtract: ['$totalRevenue', '$totalCost'] } } },
    { $sort: { totalQty: -1 } }, { $limit: parseInt(limit) },
  ]);
  res.json({ success: true, data });
});

exports.salesByCategory = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo } = req.query;
  const match = { storeId: sid, status: { $in: ['completed', 'partial_return'] }, ...dateFilter(dateFrom, dateTo) };
  const data = await Sale.aggregate([
    { $match: match }, { $unwind: '$items' },
    { $lookup: { from: 'medicines', localField: 'items.medicineId', foreignField: '_id', as: 'med' } },
    { $unwind: '$med' },
    { $group: { _id: '$med.category', totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.lineTotal' }, count: { $sum: 1 } }},
    { $sort: { totalRevenue: -1 } },
  ]);
  res.json({ success: true, data });
});

exports.salesByCashier = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo } = req.query;
  const match = { storeId: sid, status: { $in: ['completed', 'partial_return'] }, ...dateFilter(dateFrom, dateTo) };
  const data = await Sale.aggregate([
    { $match: match },
    { $group: { _id: { id: '$cashierId', name: '$cashierName' }, totalSales: { $sum: 1 }, totalRevenue: { $sum: '$netTotal' }, totalDiscount: { $sum: '$discountTotal' }, avgBill: { $avg: '$netTotal' } }},
    { $sort: { totalRevenue: -1 } },
  ]);
  res.json({ success: true, data });
});

exports.salesByCustomer = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo, limit = 30 } = req.query;
  const match = { storeId: sid, status: { $in: ['completed', 'partial_return'] }, customerId: { $ne: null }, ...dateFilter(dateFrom, dateTo) };
  const data = await Sale.aggregate([
    { $match: match },
    { $group: { _id: { id: '$customerId', name: '$customerName' }, totalSales: { $sum: 1 }, totalSpent: { $sum: '$netTotal' }, avgBill: { $avg: '$netTotal' } }},
    { $sort: { totalSpent: -1 } }, { $limit: parseInt(limit) },
  ]);
  res.json({ success: true, data });
});

exports.salesByPaymentMethod = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo } = req.query;
  const match = { storeId: sid, status: { $in: ['completed', 'partial_return'] }, ...dateFilter(dateFrom, dateTo) };
  const data = await Sale.aggregate([
    { $match: match }, { $unwind: '$payments' },
    { $group: { _id: '$payments.method', totalAmount: { $sum: '$payments.amount' }, count: { $sum: 1 } }},
    { $sort: { totalAmount: -1 } },
  ]);
  res.json({ success: true, data });
});

exports.hourlySales = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo } = req.query;
  const match = { storeId: sid, status: { $in: ['completed', 'partial_return'] }, ...dateFilter(dateFrom, dateTo) };
  const data = await Sale.aggregate([
    { $match: match },
    { $group: { _id: { $hour: '$createdAt' }, totalSales: { $sum: 1 }, totalRevenue: { $sum: '$netTotal' } }},
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data });
});

exports.discountReport = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo } = req.query;
  const match = { storeId: sid, status: { $in: ['completed', 'partial_return'] }, discountTotal: { $gt: 0 }, ...dateFilter(dateFrom, dateTo) };
  const data = await Sale.aggregate([
    { $match: match },
    { $group: { _id: '$cashierName', totalDiscount: { $sum: '$discountTotal' }, salesCount: { $sum: 1 }, avgDiscount: { $avg: '$discountTotal' } }},
    { $sort: { totalDiscount: -1 } },
  ]);
  const total = data.reduce((s, d) => s + d.totalDiscount, 0);
  res.json({ success: true, data, totalDiscount: total });
});

exports.returnReport = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const filter = { storeId: req.user.storeId, ...dateFilter(dateFrom, dateTo) };
  const returns = await SaleReturn.find(filter).populate('processedBy', 'name').sort({ createdAt: -1 });
  const totalRefund = returns.reduce((s, r) => s + r.refundAmount, 0);
  res.json({ success: true, data: returns, totalRefund, count: returns.length });
});

// ═══════════════ INVENTORY REPORTS ═══════════════

exports.stockValuation = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const data = await Medicine.aggregate([
    { $match: { storeId: sid, isActive: true, currentStock: { $gt: 0 } } },
    { $project: { medicineName: 1, genericName: 1, category: 1, currentStock: 1, costPrice: 1, salePrice: 1, costValue: { $multiply: ['$currentStock', '$costPrice'] }, retailValue: { $multiply: ['$currentStock', '$salePrice'] } }},
    { $sort: { retailValue: -1 } },
  ]);
  const totals = data.reduce((s, d) => ({ costValue: s.costValue + d.costValue, retailValue: s.retailValue + d.retailValue, items: s.items + 1 }), { costValue: 0, retailValue: 0, items: 0 });
  res.json({ success: true, data, totals });
});

exports.batchWiseStock = asyncHandler(async (req, res) => {
  const batches = await Batch.find({ storeId: req.user.storeId, remainingQty: { $gt: 0 } })
    .populate('medicineId', 'medicineName genericName category rackLocation')
    .sort({ expiryDate: 1 });
  res.json({ success: true, data: batches, count: batches.length });
});

exports.outOfStockReport = asyncHandler(async (req, res) => {
  const meds = await Medicine.find({ storeId: req.user.storeId, isActive: true, isStockTracked: true, currentStock: 0 })
    .select('medicineName genericName category rackLocation lowStockThreshold reorderLevel costPrice salePrice')
    .sort({ medicineName: 1 });
  res.json({ success: true, data: meds, count: meds.length });
});

// ═══════════════ PURCHASE REPORTS ═══════════════

exports.purchaseSummary = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo } = req.query;
  const match = { storeId: sid, ...dateFilter(dateFrom, dateTo) };
  const data = await GRN.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, totalGRNs: { $sum: 1 }, totalCost: { $sum: '$totalCost' }, totalItems: { $sum: { $size: '$items' } } }},
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data });
});

exports.purchaseBySupplier = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo } = req.query;
  const match = { storeId: sid, ...dateFilter(dateFrom, dateTo) };
  const data = await GRN.aggregate([
    { $match: match },
    { $group: { _id: { id: '$supplierId', name: '$supplierName' }, totalGRNs: { $sum: 1 }, totalCost: { $sum: '$totalCost' } }},
    { $sort: { totalCost: -1 } },
  ]);
  res.json({ success: true, data });
});

// ═══════════════ REGULATORY REPORTS ═══════════════

exports.controlledDrugReport = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, schedule } = req.query;
  const filter = { storeId: req.user.storeId, ...dateFilter(dateFrom, dateTo, 'date') };
  if (schedule) filter.schedule = schedule;
  const entries = await ControlledDrugRegister.find(filter).populate('recordedBy', 'name').sort({ date: 1 });
  res.json({ success: true, data: entries, count: entries.length });
});

// Per-product profitability
exports.productProfitability = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo, limit = 50 } = req.query;
  const match = { storeId: sid, status: { $in: ['completed', 'partial_return'] }, ...dateFilter(dateFrom, dateTo) };
  const data = await Sale.aggregate([
    { $match: match }, { $unwind: '$items' },
    { $group: { _id: { id: '$items.medicineId', name: '$items.medicineName' }, totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.lineTotal' }, totalCost: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } } }},
    { $addFields: { profit: { $subtract: ['$totalRevenue', '$totalCost'] }, margin: { $cond: [{ $gt: ['$totalRevenue', 0] }, { $multiply: [{ $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalRevenue'] }, 100] }, 0] } }},
    { $sort: { profit: -1 } }, { $limit: parseInt(limit) },
  ]);
  res.json({ success: true, data });
});

// Cash flow report
exports.cashFlowReport = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const { dateFrom, dateTo } = req.query;
  const match = dateFrom || dateTo ? dateFilter(dateFrom, dateTo) : {};

  const [salesRev, creditCollected, supplierPaid, expensesTotal, purchaseTotal] = await Promise.all([
    Sale.aggregate([{ $match: { storeId: sid, status: { $in: ['completed', 'partial_return'] }, ...match } }, { $group: { _id: null, total: { $sum: '$totalPaid' } } }]),
    require('../models/CustomerPayment').aggregate([{ $match: { storeId: sid, ...match } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    require('../models/SupplierPayment').aggregate([{ $match: { storeId: sid, ...match } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { storeId: sid, ...(dateFrom || dateTo ? dateFilter(dateFrom, dateTo, 'date') : {}) } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    GRN.aggregate([{ $match: { storeId: sid, ...match } }, { $group: { _id: null, total: { $sum: '$totalCost' } } }]),
  ]);

  const cashIn = (salesRev[0]?.total || 0) + (creditCollected[0]?.total || 0);
  const cashOut = (supplierPaid[0]?.total || 0) + (expensesTotal[0]?.total || 0);
  res.json({ success: true, data: { cashIn, cashOut, netCashFlow: cashIn - cashOut, breakdown: { salesRevenue: salesRev[0]?.total || 0, creditCollected: creditCollected[0]?.total || 0, supplierPayments: supplierPaid[0]?.total || 0, expenses: expensesTotal[0]?.total || 0, purchases: purchaseTotal[0]?.total || 0 } } });
});

// Expiry loss report
exports.expiryLossReport = asyncHandler(async (req, res) => {
  const sid = getSid(req.user.storeId);
  const data = await Batch.aggregate([
    { $match: { storeId: sid, isExpired: true, remainingQty: { $gt: 0 } } },
    { $lookup: { from: 'medicines', localField: 'medicineId', foreignField: '_id', as: 'med' } },
    { $unwind: { path: '$med', preserveNullAndEmptyArrays: true } },
    { $project: { medicineName: '$med.medicineName', batchNumber: 1, expiryDate: 1, remainingQty: 1, costPrice: 1, lossValue: { $multiply: ['$remainingQty', '$costPrice'] } } },
    { $sort: { lossValue: -1 } },
  ]);
  const totalLoss = data.reduce((s, d) => s + (d.lossValue || 0), 0);
  res.json({ success: true, data, totalLoss });
});

// ═══════════════ REPORT INDEX ═══════════════

exports.getReportsList = asyncHandler(async (req, res) => {
  const reports = [
    { group: 'Sales', items: [
      { key: 'sales-summary', name: 'Sales Summary', desc: 'Daily/weekly/monthly sales' },
      { key: 'sales-by-product', name: 'Sales by Product', desc: 'Top selling products' },
      { key: 'sales-by-category', name: 'Sales by Category', desc: 'Category-wise breakdown' },
      { key: 'sales-by-cashier', name: 'Sales by Cashier', desc: 'Staff performance' },
      { key: 'sales-by-customer', name: 'Sales by Customer', desc: 'Top customers' },
      { key: 'sales-by-payment', name: 'Payment Methods', desc: 'Cash/card/UPI breakdown' },
      { key: 'hourly-sales', name: 'Hourly Pattern', desc: 'Peak hours analysis' },
      { key: 'discount-report', name: 'Discount Report', desc: 'Who gave how much' },
      { key: 'return-report', name: 'Returns/Refunds', desc: 'Return analysis' },
      { key: 'product-profitability', name: 'Product Profitability', desc: 'Revenue vs cost per medicine' },
      { key: 'sales-by-doctor', name: 'Sales by Doctor', desc: 'Prescriptions dispensed per doctor' },
    ]},
    { group: 'Inventory', items: [
      { key: 'stock-valuation', name: 'Stock Valuation', desc: 'Current stock at cost & retail' },
      { key: 'batch-wise-stock', name: 'Batch-wise Stock', desc: 'All batches with expiry' },
      { key: 'out-of-stock', name: 'Out of Stock', desc: 'Zero stock products' },
      { key: 'expiry-loss', name: 'Expiry Loss Report', desc: 'Value of expired unsold stock' },
    ]},
    { group: 'Purchase', items: [
      { key: 'purchase-summary', name: 'Purchase Summary', desc: 'Monthly purchases' },
      { key: 'purchase-by-supplier', name: 'Purchase by Supplier', desc: 'Supplier-wise spend' },
    ]},
    { group: 'Financial', items: [
      { key: 'cash-flow', name: 'Cash Flow', desc: 'Cash in vs cash out' },
    ]},
    { group: 'Regulatory', items: [
      { key: 'controlled-drugs', name: 'Controlled Drug Register', desc: 'H/H1/X drug log' },
    ]},
  ];
  res.json({ success: true, data: reports });
});

// Sales by Doctor
exports.salesByDoctor = asyncHandler(async (req, res) => {
  const Prescription = require('../models/Prescription');
  const { dateFrom, dateTo } = req.query;
  const filter = { storeId: req.user.storeId, status: 'dispensed', ...dateFilter(dateFrom, dateTo, 'dispensedAt') };
  const data = await Prescription.aggregate([
    { $match: filter },
    { $group: { _id: '$doctorName', prescriptions: { $sum: 1 }, medicines: { $sum: { $size: '$medicines' } } } },
    { $sort: { prescriptions: -1 } },
  ]);
  res.json({ success: true, data });
});
