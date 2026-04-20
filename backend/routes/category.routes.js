const router = require('express').Router();
const { protect, authorize, tenantFilter } = require('../middleware/auth');
const ctrl = require('../controllers/category.controller');

router.use(protect);

router.route('/')
  .get(ctrl.getCategories)
  .post(authorize('SuperAdmin', 'StoreAdmin'), ctrl.createCategory);

router.route('/:id')
  .get(tenantFilter, ctrl.getCategory)
  .put(authorize('SuperAdmin', 'StoreAdmin'), tenantFilter, ctrl.updateCategory)
  .delete(authorize('SuperAdmin', 'StoreAdmin'), tenantFilter, ctrl.deleteCategory);

module.exports = router;
