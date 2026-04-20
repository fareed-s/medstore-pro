const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/regulatory.controller');

router.use(protect);

// Dashboard
router.get('/dashboard', ctrl.getComplianceDashboard);

// Controlled Drug Register
router.get('/controlled-drugs', ctrl.getControlledDrugEntries);
router.post('/controlled-drugs', authorize('SuperAdmin', 'StoreAdmin', 'Pharmacist'), ctrl.addControlledDrugEntry);
router.post('/controlled-drugs/:id/correct', authorize('SuperAdmin', 'StoreAdmin'), ctrl.correctEntry);
router.get('/controlled-drugs/balance', ctrl.getControlledDrugBalance);
router.get('/narcotic-report', authorize('SuperAdmin', 'StoreAdmin'), ctrl.getNarcoticReport);

// Drug Licenses
router.get('/licenses', ctrl.getDrugLicenses);
router.post('/licenses', authorize('SuperAdmin', 'StoreAdmin'), ctrl.createDrugLicense);
router.put('/licenses/:id', authorize('SuperAdmin', 'StoreAdmin'), ctrl.updateDrugLicense);
router.delete('/licenses/:id', authorize('SuperAdmin', 'StoreAdmin'), ctrl.deleteDrugLicense);
router.get('/licenses/alerts', ctrl.getDLExpiryAlerts);

// Expiry Destruction
router.get('/destructions', ctrl.getDestructions);
router.post('/destructions', authorize('SuperAdmin', 'StoreAdmin'), ctrl.createDestruction);
router.get('/destructions/:id', ctrl.getDestruction);

module.exports = router;
