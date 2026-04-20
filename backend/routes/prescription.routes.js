const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/prescription.controller');

router.use(protect);

router.get('/', ctrl.getPrescriptions);
router.post('/', authorize('SuperAdmin', 'StoreAdmin', 'Pharmacist'), ctrl.createPrescription);
router.get('/refill-reminders', ctrl.getRefillReminders);
router.get('/doctors', ctrl.getDoctors);
router.get('/:id', ctrl.getPrescription);
router.put('/:id', authorize('SuperAdmin', 'StoreAdmin', 'Pharmacist'), ctrl.updatePrescription);
router.post('/:id/dispense', authorize('SuperAdmin', 'StoreAdmin', 'Pharmacist'), ctrl.dispensePrescription);
router.post('/check-interactions', ctrl.checkInteractions);

module.exports = router;
