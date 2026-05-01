const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/user.controller');

router.use(protect, authorize('SuperAdmin', 'StoreAdmin'));

router.get('/modules', ctrl.getModuleCatalog);
router.route('/').get(ctrl.getUsers).post(ctrl.createUser);
router.route('/:id').put(ctrl.updateUser).delete(ctrl.deleteUser);
router.put('/:id/reset-password', ctrl.resetUserPassword);

module.exports = router;
