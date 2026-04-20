const router = require('express').Router();
const { protect, authorize, tenantFilter, hideCostPrice } = require('../middleware/auth');
const ctrl = require('../controllers/medicine.controller');

router.use(protect);

router.get('/search', hideCostPrice, ctrl.searchMedicines);
router.get('/barcode/:code', hideCostPrice, ctrl.getByBarcode);
router.get('/low-stock', ctrl.getLowStock);
router.get('/expiring', ctrl.getExpiring);
router.get('/substitutes/:id', ctrl.getSubstitutes);
router.post('/bulk-import', authorize('SuperAdmin', 'StoreAdmin'), ctrl.bulkImport);

router.route('/')
  .get(tenantFilter, hideCostPrice, ctrl.getMedicines)
  .post(authorize('SuperAdmin', 'StoreAdmin', 'Pharmacist'), ctrl.createMedicine);

router.route('/:id')
  .get(tenantFilter, hideCostPrice, ctrl.getMedicine)
  .put(authorize('SuperAdmin', 'StoreAdmin', 'Pharmacist'), tenantFilter, ctrl.updateMedicine)
  .delete(authorize('SuperAdmin', 'StoreAdmin'), tenantFilter, ctrl.deleteMedicine);

module.exports = router;
