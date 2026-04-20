const Customer = require('../models/Customer');
const CustomerPayment = require('../models/CustomerPayment');
const Sale = require('../models/Sale');
const { asyncHandler } = require('../utils/errorHandler');

// ═══ CRUD ═══
exports.getCustomers = asyncHandler(async (req, res) => {
  const { search, type, page = 1, limit = 25 } = req.query;
  const filter = { storeId: req.user.storeId, isActive: true };
  if (type) filter.customerType = type;
  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const total = await Customer.countDocuments(filter);
  const customers = await Customer.find(filter)
    .select('customerName phone customerType currentBalance loyaltyPoints loyaltyTier totalSpent visitCount lastVisit allergies')
    .sort({ customerName: 1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: customers, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
});

exports.getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  res.json({ success: true, data: customer });
});

exports.createCustomer = asyncHandler(async (req, res) => {
  const data = { ...req.body, storeId: req.user.storeId };
  // Check duplicate phone
  const existing = await Customer.findOne({ storeId: req.user.storeId, phone: data.phone });
  if (existing) return res.status(400).json({ success: false, message: 'Phone number already registered' });
  const customer = await Customer.create(data);
  res.status(201).json({ success: true, data: customer });
});

exports.updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, storeId: req.user.storeId }, req.body, { new: true, runValidators: true }
  );
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  res.json({ success: true, data: customer });
});

exports.deleteCustomer = asyncHandler(async (req, res) => {
  await Customer.findOneAndUpdate({ _id: req.params.id, storeId: req.user.storeId }, { isActive: false });
  res.json({ success: true, message: 'Customer deactivated' });
});

// ═══ SEARCH (for POS) ═══
exports.searchCustomers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ success: true, data: [] });
  const customers = await Customer.find({
    storeId: req.user.storeId, isActive: true,
    $or: [
      { customerName: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ],
  }).select('customerName phone customerType currentBalance allergies').limit(10);
  res.json({ success: true, data: customers });
});

// ═══ ALLERGIES & MEDICATIONS ═══
exports.updateAllergies = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  customer.allergies = req.body.allergies || [];
  await customer.save();
  res.json({ success: true, data: customer.allergies });
});

exports.updateMedications = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  customer.currentMedications = req.body.medications || [];
  await customer.save();
  res.json({ success: true, data: customer.currentMedications });
});

exports.updateConditions = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  customer.conditions = req.body.conditions || [];
  await customer.save();
  res.json({ success: true, data: customer.conditions });
});

// ═══ CREDIT / UDHAR ═══
exports.recordPayment = asyncHandler(async (req, res) => {
  const { amount, method = 'cash', reference, notes } = req.body;
  const customer = await Customer.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

  const payment = await CustomerPayment.create({
    storeId: req.user.storeId, customerId: customer._id, customerName: customer.customerName,
    amount: parseFloat(amount), method, reference, notes, receivedBy: req.user._id,
  });

  customer.currentBalance = Math.max(0, customer.currentBalance - parseFloat(amount));
  if (customer.currentBalance <= 0) customer.creditBlocked = false;
  await customer.save();

  res.status(201).json({ success: true, data: payment, newBalance: customer.currentBalance });
});

// ═══ CUSTOMER LEDGER ═══
exports.getCustomerLedger = asyncHandler(async (req, res) => {
  const storeId = req.user.storeId;
  const customerId = req.params.id;
  const customer = await Customer.findOne({ _id: customerId, storeId });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

  const [sales, payments] = await Promise.all([
    Sale.find({ storeId, customerId, status: { $in: ['completed', 'partial_return'] } })
      .select('invoiceNo netTotal createdAt').sort({ createdAt: 1 }),
    CustomerPayment.find({ storeId, customerId }).select('amount method reference createdAt').sort({ createdAt: 1 }),
  ]);

  const entries = [];
  sales.forEach(s => entries.push({ date: s.createdAt, type: 'sale', ref: s.invoiceNo, debit: s.netTotal, credit: 0 }));
  payments.forEach(p => entries.push({ date: p.createdAt, type: 'payment', ref: p.reference || '', method: p.method, debit: 0, credit: p.amount }));
  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  let balance = 0;
  entries.forEach(e => { balance += e.debit - e.credit; e.balance = balance; });

  res.json({ success: true, data: { customer, entries, currentBalance: customer.currentBalance } });
});

// ═══ PURCHASE HISTORY ═══
exports.getPurchaseHistory = asyncHandler(async (req, res) => {
  const sales = await Sale.find({
    storeId: req.user.storeId, customerId: req.params.id,
    status: { $in: ['completed', 'partial_return'] },
  }).select('invoiceNo items netTotal createdAt cashierName').sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: sales });
});

// ═══ LOYALTY ═══
exports.redeemPoints = asyncHandler(async (req, res) => {
  const { points } = req.body;
  const customer = await Customer.findOne({ _id: req.params.id, storeId: req.user.storeId });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  if (customer.loyaltyPoints < points) return res.status(400).json({ success: false, message: 'Insufficient points' });

  customer.loyaltyPoints -= points;
  customer.totalPointsRedeemed += points;
  await customer.save();
  res.json({ success: true, data: { loyaltyPoints: customer.loyaltyPoints, redeemed: points, discountValue: points } });
});

// ═══ CREDIT CUSTOMERS OUTSTANDING ═══
exports.getCreditOutstanding = asyncHandler(async (req, res) => {
  const customers = await Customer.find({
    storeId: req.user.storeId, isActive: true, currentBalance: { $gt: 0 },
  }).select('customerName phone currentBalance creditLimit lastVisit customerType').sort({ currentBalance: -1 });

  const total = customers.reduce((s, c) => s + c.currentBalance, 0);
  res.json({ success: true, data: { customers, totalOutstanding: total, count: customers.length } });
});
