const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/store.controller');

router.use(protect);
router.get('/', ctrl.getStore);
router.put('/', authorize('StoreAdmin'), ctrl.updateStore);
router.put('/settings', authorize('StoreAdmin'), ctrl.updateSettings);

module.exports = router;
