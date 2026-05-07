const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireUnlocked } = require('../middleware/controlledAccess');
const auth = require('../controllers/controlled-auth.controller');

// All routes here REQUIRE main login. Module-token check (`requireUnlocked`)
// is added per-route below — auth/status and auth/unlock are deliberately
// outside that gate (they're how you GET the module token).
router.use(protect);

// ─── Auth / Session ────────────────────────────────────────────────────────
router.get('/auth/status', auth.status);
router.post('/auth/unlock', auth.unlock);
router.post('/auth/lock', auth.lock);
router.post('/auth/inspection-on', auth.activateInspectionMode);

// Tiny ping for the frontend to verify the unlock works end-to-end.
router.get('/ping', requireUnlocked, (req, res) => {
  res.json({
    success: true,
    data: { storeId: req.user.storeId, role: req.user.role, message: 'module unlocked' },
  });
});

// ─── Medicines (Phase 2) ──────────────────────────────────────────────────
const med = require('../controllers/controlled-medicine.controller');
router.get   ('/medicines',                         requireUnlocked, med.list);
router.post  ('/medicines',                         requireUnlocked, med.create);
router.get   ('/medicines/:id',                     requireUnlocked, med.getOne);
router.put   ('/medicines/:id',                     requireUnlocked, med.update);
router.delete('/medicines/:id',                     requireUnlocked, med.softDelete);
router.post  ('/medicines/:id/batches',             requireUnlocked, med.addBatch);
router.put   ('/medicines/:id/batches/:batchId',    requireUnlocked, med.updateBatch);
router.delete('/medicines/:id/batches/:batchId',    requireUnlocked, med.removeBatch);

// ─── Sales (Phase 3) ──────────────────────────────────────────────────────
const sale = require('../controllers/controlled-sale.controller');
router.get ('/sales',                requireUnlocked, sale.list);
router.get ('/sales/stats/today',    requireUnlocked, sale.todayStats);
router.post('/sales',                requireUnlocked, sale.create);
router.get ('/sales/:id',            requireUnlocked, sale.getOne);
router.post('/sales/:id/void',       requireUnlocked, sale.voidSale);

// ─── Purchases (Phase 4) ──────────────────────────────────────────────────
const purchase = require('../controllers/controlled-purchase.controller');
router.get ('/purchases',         requireUnlocked, purchase.list);
router.post('/purchases',         requireUnlocked, purchase.create);
router.get ('/purchases/:id',     requireUnlocked, purchase.getOne);

// ─── Reports (Phase 4) ────────────────────────────────────────────────────
const report = require('../controllers/controlled-report.controller');
router.get('/reports/sales-summary', requireUnlocked, report.salesSummary);
router.get('/reports/stock',         requireUnlocked, report.stock);
router.get('/reports/register',      requireUnlocked, report.register);

// ─── Access Logs viewer (Phase 4) ─────────────────────────────────────────
const log = require('../controllers/controlled-log.controller');
router.get('/logs', requireUnlocked, log.list);

module.exports = router;
