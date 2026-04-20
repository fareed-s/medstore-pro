const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/notification.controller');
router.use(protect);
router.get('/', ctrl.getNotifications);
router.put('/:id/read', ctrl.markRead);
router.put('/read-all', ctrl.markAllRead);
router.delete('/:id', ctrl.deleteNotification);
module.exports = router;
