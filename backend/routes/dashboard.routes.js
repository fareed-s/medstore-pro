const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/dashboard.controller');

router.use(protect);
router.get('/stats', ctrl.getDashboardStats);

module.exports = router;
