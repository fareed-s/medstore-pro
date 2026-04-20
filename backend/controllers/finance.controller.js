const { toObjectId } = require('../utils/objectId');
const CashRegister = require('../models/CashRegister');
const Expense = require('../models/Expense');
const Sale = require('../models/Sale');
const SaleReturn = require('../models/SaleReturn');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const SupplierPayment = require('../models/SupplierPayment');
const CustomerPayment = require('../models/CustomerPayment');
const GRN = require('../models/GRN');
const { asyncHandler } = require('../utils/errorHandler');
const mongoose = require('mongoose');

// ═══════════════════════════════
// CASH REGISTER
// ═══════════════════════════════
exports.openRegister = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const existing = await CashRegister.findOne({ storeId, status: 'open' });
  if (existing) return res.status(400).json({ success: false, message: 'Register already open', data: existing });

  const { openingBalance = 0 } = req.body;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const register = await CashRegister.create({
    storeId, date: today, openingBalance,
    openedBy: req.user._id, status: 'open',
  });
  res.status(201).json({ success: true, data: register });
});

exports.getOpenRegister = asyncHandler(async (req, res) => {
  const register = await CashRegister.findOne({ storeId: req.user.storeId, status: 'open' })
    .populate('openedBy', 'name');
  if (!register) return res.json({ success: true, data: null, message: 'No open register' });
  res.json({ success: true, data: register });
});

exports.addTransaction = asyncHandler(async (req, res) => {
  const register = await CashRegister.findOne({ storeId: req.user.storeId, status: 'open' });
  if (!register) return res.status(400).json({ success: false, message: 'No open register' });

  const { type, category, amount, description, referenceType, referenceId, referenceNo } = req.body;
  register.transactions.push({
    type, category, amount: parseFloat(amount), description,
    referenceType, referenceId, referenceNo,
    recordedBy: req.user._id,
  });

  if (type === 'cash_in') register.cashIn += parseFloat(amount);
  else register.cashOut += parseFloat(amount);

  register.expectedClosing = register.openingBalance + register.cashIn - register.cashOut;
  await register.save();
  res.json({ success: true, data: register });
});

exports.closeRegister = asyncHandler(async (req, res) => {
  const register = await CashRegister.findOne({ storeId: req.user.storeId, status: 'open' });
  if (!register) return res.status(400).json({ success: false, message: 'No open register' });

  const { closingBalance, notes } = req.body;
  const actual = parseFloat(closingBalance);
  const expected = register.openingBalance + register.cashIn - register.cashOut;
  const diff = actual - expected;

  register.closingBalance = actual;
  register.expectedClosing = expected;
  register.overage = diff > 0 ? diff : 0;
  register.shortage = diff < 0 ? Math.abs(diff) : 0;
  register.status = 'closed';
  register.closedBy = req.user._id;
  register.closedAt = new Date();
  register.notes = notes;
  await register.save();

  res.json({ success: true, data: register });
});

exports.getRegisterHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15 } = req.query;
  const filter = { storeId: req.user.storeId };
  const total = await CashRegister.countDocuments(filter);
  const registers = await CashRegister.find(filter)
    .populate('openedBy', 'name').populate('closedBy', 'name')
    .sort({ date: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: registers, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
});

// ═══════════════════════════════
// EXPENSES
// ═══════════════════════════════
exports.getExpenses = asyncHandler(async (req, res) => {
  const { category, dateFrom, dateTo, page = 1, limit = 25 } = req.query;
  const filter = { storeId: req.user.storeId };
  if (category) filter.category = category;
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo + 'T23:59:59');
  }
  const total = await Expense.countDocuments(filter);
  const expenses = await Expense.find(filter).populate('addedBy', 'name').sort({ date: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: expenses, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
});

exports.createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({ ...req.body, storeId: req.user.storeId, addedBy: req.user._id });
  res.status(201).json({ success: true, data: expense });
});

exports.updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndUpdate({ _id: req.params.id, storeId: req.user.storeId }, req.body, { new: true });
  if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
  res.json({ success: true, data: expense });
});

exports.deleteExpense = asyncHandler(async (req, res) => {
  await Expense.findOneAndDelete({ _id: req.params.id, storeId: req.user.storeId });
  res.json({ success: true, message: 'Expense deleted' });
});

exports.getExpenseSummary = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const sid = toObjectId(storeId);
  const { dateFrom, dateTo } = req.query;

  const match = { storeId: sid };
  if (dateFrom || dateTo) {
    match.date = {};
    if (dateFrom) match.date.$gte = new Date(dateFrom);
    if (dateTo) match.date.$lte = new Date(dateTo + 'T23:59:59');
  }

  const byCategory = await Expense.aggregate([
    { $match: match },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  const total = byCategory.reduce((s, c) => s + c.total, 0);
  res.json({ success: true, data: { byCategory, total } });
});

// ═══════════════════════════════
// PROFIT & LOSS
// ═══════════════════════════════
exports.getProfitAndLoss = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const sid = toObjectId(storeId);
  const { dateFrom, dateTo } = req.query;

  const dateMatch = {};
  if (dateFrom) dateMatch.$gte = new Date(dateFrom);
  if (dateTo) dateMatch.$lte = new Date(dateTo + 'T23:59:59');
  const hasDate = Object.keys(dateMatch).length > 0;

  // Revenue (sales - returns)
  const salesMatch = { storeId: sid, status: { $in: ['completed', 'partial_return'] } };
  if (hasDate) salesMatch.createdAt = dateMatch;

  const [salesAgg, returnsAgg, expenseAgg, purchaseAgg] = await Promise.all([
    Sale.aggregate([
      { $match: salesMatch },
      { $group: { _id: null, revenue: { $sum: '$netTotal' }, tax: { $sum: '$taxTotal' }, discount: { $sum: '$discountTotal' }, count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: salesMatch },
      { $unwind: '$items' },
      { $group: { _id: null, cogs: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } } } },
    ]),
    Expense.aggregate([
      { $match: { storeId: sid, ...(hasDate ? { date: dateMatch } : {}) } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]),
    GRN.aggregate([
      { $match: { storeId: sid, ...(hasDate ? { createdAt: dateMatch } : {}) } },
      { $group: { _id: null, totalPurchases: { $sum: '$totalCost' } } },
    ]),
  ]);

  const revenue = salesAgg[0]?.revenue || 0;
  const salesTax = salesAgg[0]?.tax || 0;
  const salesDiscount = salesAgg[0]?.discount || 0;
  const salesCount = salesAgg[0]?.count || 0;
  const cogs = returnsAgg[0]?.cogs || 0;
  const grossProfit = revenue - cogs;
  const operatingExpenses = expenseAgg[0]?.totalExpenses || 0;
  const netProfit = grossProfit - operatingExpenses;
  const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : 0;
  const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;
  const totalPurchases = purchaseAgg[0]?.totalPurchases || 0;

  res.json({
    success: true,
    data: {
      revenue, cogs, grossProfit, grossMargin,
      operatingExpenses, netProfit, netMargin,
      salesTax, salesDiscount, salesCount, totalPurchases,
    },
  });
});

// ═══════════════════════════════
// TAX / GST REPORT
// ═══════════════════════════════
exports.getTaxReport = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const sid = toObjectId(storeId);
  const { dateFrom, dateTo } = req.query;

  const match = { storeId: sid, status: { $in: ['completed', 'partial_return'] } };
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo + 'T23:59:59');
  }

  // Tax by rate
  const taxByRate = await Sale.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.taxRate',
        taxableAmount: { $sum: { $subtract: [{ $multiply: ['$items.unitPrice', '$items.quantity'] }, '$items.discount'] } },
        taxAmount: { $sum: '$items.tax' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const totalTax = taxByRate.reduce((s, t) => s + t.taxAmount, 0);
  const totalTaxable = taxByRate.reduce((s, t) => s + t.taxableAmount, 0);

  res.json({ success: true, data: { taxByRate, totalTax, totalTaxable } });
});

// ═══════════════════════════════
// ACCOUNTS PAYABLE (Supplier Balances)
// ═══════════════════════════════
exports.getAccountsPayable = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find({
    storeId: req.user.storeId, isActive: true, currentBalance: { $gt: 0 },
  }).select('supplierName companyName currentBalance paymentTerms phone').sort({ currentBalance: -1 });

  const total = suppliers.reduce((s, sup) => s + sup.currentBalance, 0);

  // Aging
  const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
  // Simplified aging based on total balance
  for (const s of suppliers) {
    if (s.paymentTerms === 'COD') aging.current += s.currentBalance;
    else if (s.paymentTerms === 'Credit 15') aging.current += s.currentBalance;
    else if (s.paymentTerms === 'Credit 30') aging.days30 += s.currentBalance;
    else if (s.paymentTerms === 'Credit 60') aging.days60 += s.currentBalance;
    else aging.days90 += s.currentBalance;
  }

  res.json({ success: true, data: { suppliers, total, count: suppliers.length, aging } });
});

// ═══════════════════════════════
// ACCOUNTS RECEIVABLE (Customer Balances)
// ═══════════════════════════════
exports.getAccountsReceivable = asyncHandler(async (req, res) => {
  const customers = await Customer.find({
    storeId: req.user.storeId, isActive: true, currentBalance: { $gt: 0 },
  }).select('customerName phone currentBalance creditLimit customerType lastVisit').sort({ currentBalance: -1 });

  const total = customers.reduce((s, c) => s + c.currentBalance, 0);
  res.json({ success: true, data: { customers, total, count: customers.length } });
});

// ═══════════════════════════════
// DAILY COLLECTION REPORT
// ═══════════════════════════════
exports.getDailyCollection = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const sid = toObjectId(storeId);
  const { date } = req.query;
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  const next = new Date(d); next.setDate(next.getDate() + 1);

  const [salesPayments, customerPayments, supplierPayments, expenses] = await Promise.all([
    Sale.aggregate([
      { $match: { storeId: sid, createdAt: { $gte: d, $lt: next }, status: { $in: ['completed', 'partial_return'] } } },
      { $unwind: '$payments' },
      { $group: { _id: '$payments.method', total: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
    ]),
    CustomerPayment.aggregate([
      { $match: { storeId: sid, createdAt: { $gte: d, $lt: next } } },
      { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    SupplierPayment.aggregate([
      { $match: { storeId: sid, createdAt: { $gte: d, $lt: next } } },
      { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { storeId: sid, date: { $gte: d, $lt: next } } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      date: d,
      salesPayments,
      customerPayments,
      supplierPayments,
      expenses,
      totalSalesCollection: salesPayments.reduce((s, p) => s + p.total, 0),
      totalCreditCollected: customerPayments.reduce((s, p) => s + p.total, 0),
      totalPaidToSuppliers: supplierPayments.reduce((s, p) => s + p.total, 0),
      totalExpenses: expenses.reduce((s, e) => s + e.total, 0),
    },
  });
});
