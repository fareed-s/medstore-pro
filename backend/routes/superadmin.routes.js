const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/superadmin.controller');

router.use(protect, authorize('SuperAdmin'));
router.get('/stats', ctrl.getGlobalStats);
router.get('/stores', ctrl.getStores);
router.put('/stores/:id/approve', ctrl.approveStore);
router.put('/stores/:id/toggle', ctrl.toggleStore);
router.put('/stores/:id/suspend', ctrl.suspendStore);
router.put('/stores/:id/plan', ctrl.updatePlan);
router.get('/users', ctrl.getUsers);
router.put('/users/:id', ctrl.updateUser);

module.exports = router;
