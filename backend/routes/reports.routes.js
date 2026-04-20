const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/reports.controller');

router.use(protect, authorize('SuperAdmin', 'StoreAdmin'));

router.get('/', ctrl.getReportsList);
router.get('/sales-summary', ctrl.salesSummary);
router.get('/sales-by-product', ctrl.salesByProduct);
router.get('/sales-by-category', ctrl.salesByCategory);
router.get('/sales-by-cashier', ctrl.salesByCashier);
router.get('/sales-by-customer', ctrl.salesByCustomer);
router.get('/sales-by-payment', ctrl.salesByPaymentMethod);
router.get('/hourly-sales', ctrl.hourlySales);
router.get('/discount-report', ctrl.discountReport);
router.get('/return-report', ctrl.returnReport);
router.get('/stock-valuation', ctrl.stockValuation);
router.get('/batch-wise-stock', ctrl.batchWiseStock);
router.get('/out-of-stock', ctrl.outOfStockReport);
router.get('/purchase-summary', ctrl.purchaseSummary);
router.get('/purchase-by-supplier', ctrl.purchaseBySupplier);
router.get('/controlled-drugs', ctrl.controlledDrugReport);
router.get('/product-profitability', ctrl.productProfitability);
router.get('/cash-flow', ctrl.cashFlowReport);
router.get('/expiry-loss', ctrl.expiryLossReport);
router.get('/sales-by-doctor', ctrl.salesByDoctor);

module.exports = router;
