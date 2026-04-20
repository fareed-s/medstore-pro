const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/sale.controller');

router.use(protect);

// POS operations
router.post('/', authorize('SuperAdmin', 'StoreAdmin', 'Pharmacist', 'Cashier'), ctrl.createSale);
router.get('/', ctrl.getSales);
router.get('/today-summary', ctrl.getTodaySummary);
router.get('/returns', ctrl.getReturns);

// Hold/Resume
router.post('/hold', authorize('SuperAdmin', 'StoreAdmin', 'Pharmacist', 'Cashier'), ctrl.holdBill);
router.get('/held', ctrl.getHeldBills);
router.post('/held/:id/resume', ctrl.resumeHeldBill);
router.delete('/held/:id', ctrl.deleteHeldBill);

// Single sale
router.get('/:id', ctrl.getSale);
router.post('/:id/void', authorize('SuperAdmin', 'StoreAdmin', 'Pharmacist'), ctrl.voidSale);
router.post('/:id/return', authorize('SuperAdmin', 'StoreAdmin', 'Pharmacist'), ctrl.processReturn);

module.exports = router;
