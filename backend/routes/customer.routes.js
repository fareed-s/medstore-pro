const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/customer.controller');

router.use(protect);

router.get('/search', ctrl.searchCustomers);
router.get('/credit-outstanding', ctrl.getCreditOutstanding);
router.get('/', ctrl.getCustomers);
router.post('/', ctrl.createCustomer);
router.get('/:id', ctrl.getCustomer);
router.put('/:id', ctrl.updateCustomer);
router.delete('/:id', authorize('SuperAdmin', 'StoreAdmin'), ctrl.deleteCustomer);
router.put('/:id/allergies', ctrl.updateAllergies);
router.put('/:id/medications', ctrl.updateMedications);
router.put('/:id/conditions', ctrl.updateConditions);
router.post('/:id/payment', ctrl.recordPayment);
router.get('/:id/ledger', ctrl.getCustomerLedger);
router.get('/:id/history', ctrl.getPurchaseHistory);
router.post('/:id/redeem-points', ctrl.redeemPoints);

module.exports = router;
