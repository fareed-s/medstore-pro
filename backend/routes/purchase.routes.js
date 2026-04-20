const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/purchase.controller');

router.use(protect);

// Suppliers
router.get('/suppliers', ctrl.getSuppliers);
router.post('/suppliers', authorize('SuperAdmin', 'StoreAdmin'), ctrl.createSupplier);
router.get('/suppliers/outstanding', ctrl.getSupplierOutstanding);
router.get('/suppliers/:id', ctrl.getSupplier);
router.put('/suppliers/:id', authorize('SuperAdmin', 'StoreAdmin'), ctrl.updateSupplier);
router.delete('/suppliers/:id', authorize('SuperAdmin', 'StoreAdmin'), ctrl.deleteSupplier);
router.get('/suppliers/:id/ledger', ctrl.getSupplierLedger);

// Purchase Orders
router.get('/orders', ctrl.getPurchaseOrders);
router.post('/orders', authorize('SuperAdmin', 'StoreAdmin'), ctrl.createPurchaseOrder);
router.get('/orders/:id', ctrl.getPurchaseOrder);
router.put('/orders/:id', authorize('SuperAdmin', 'StoreAdmin'), ctrl.updatePurchaseOrder);
router.post('/orders/:id/send', authorize('SuperAdmin', 'StoreAdmin'), ctrl.sendPurchaseOrder);
router.post('/orders/:id/cancel', authorize('SuperAdmin', 'StoreAdmin'), ctrl.cancelPurchaseOrder);

// GRN
router.get('/grn', ctrl.getGRNs);
router.post('/grn', authorize('SuperAdmin', 'StoreAdmin', 'InventoryStaff'), ctrl.createGRN);
router.get('/grn/:id', ctrl.getGRN);

// Payments
router.get('/payments', ctrl.getPayments);
router.post('/payments', authorize('SuperAdmin', 'StoreAdmin'), ctrl.recordPayment);

// Purchase Returns
router.get('/returns', ctrl.getPurchaseReturns);
router.post('/returns', authorize('SuperAdmin', 'StoreAdmin'), ctrl.createPurchaseReturn);

// Price History
router.get('/price-history/:medicineId', ctrl.getPriceHistory);

module.exports = router;
