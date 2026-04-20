const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/inventory-v2.controller');

router.use(protect);

// Stock movements
router.get('/movements', ctrl.getStockMovements);
router.get('/movements/summary', ctrl.getMovementSummary);

// Stock counts (physical reconciliation)
router.get('/counts', ctrl.getStockCounts);
router.post('/counts', authorize('SuperAdmin', 'StoreAdmin', 'InventoryStaff'), ctrl.createStockCount);
router.get('/counts/:id', ctrl.getStockCount);
router.put('/counts/:id', authorize('SuperAdmin', 'StoreAdmin', 'InventoryStaff'), ctrl.updateStockCount);
router.post('/counts/:id/approve', authorize('SuperAdmin', 'StoreAdmin'), ctrl.approveStockCount);

// Dead stock & movers analysis
router.get('/dead-stock', ctrl.getDeadStock);
router.get('/movers', ctrl.getMoversAnalysis);

// Rack location management
router.get('/racks', ctrl.getRackLocations);
router.get('/racks/:rack', ctrl.getMedicinesByRack);
router.put('/rack-location', authorize('SuperAdmin', 'StoreAdmin', 'InventoryStaff'), ctrl.updateRackLocation);
router.put('/rack-location/bulk', authorize('SuperAdmin', 'StoreAdmin', 'InventoryStaff'), ctrl.bulkUpdateRack);

// Enhanced expiry
router.post('/batches/:id/expire', authorize('SuperAdmin', 'StoreAdmin', 'InventoryStaff'), ctrl.markBatchExpired);
router.get('/expiry-value-report', ctrl.getExpiryValueReport);

// Reorder suggestions
router.get('/reorder-suggestions', ctrl.getReorderSuggestions);

module.exports = router;
