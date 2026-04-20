const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/batch.controller');

router.use(protect);

router.get('/', ctrl.getBatches);
router.post('/', authorize('SuperAdmin', 'StoreAdmin', 'InventoryStaff'), ctrl.createBatch);
router.put('/:id', authorize('SuperAdmin', 'StoreAdmin', 'InventoryStaff'), ctrl.updateBatch);
router.get('/expiry-dashboard', ctrl.getExpiryDashboard);
router.post('/adjust', authorize('SuperAdmin', 'StoreAdmin', 'InventoryStaff'), ctrl.adjustStock);
router.get('/adjustments', ctrl.getAdjustments);

module.exports = router;
