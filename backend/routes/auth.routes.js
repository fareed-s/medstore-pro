const router = require('express').Router();
const { login, getMe, logout, updatePassword, updateProfile, uploadAvatar } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validate, loginSchema } = require('../middleware/validate');
const { uploadAvatar: uploadAvatarMiddleware } = require('../middleware/upload');

// Public store registration is disabled — new stores are created by SuperAdmin
// via POST /api/superadmin/stores. Reject any direct /register hits.
router.post('/register', (req, res) =>
  res.status(403).json({ success: false, message: 'Store registration is closed. Contact the platform administrator.' })
);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/password', protect, updatePassword);
router.put('/profile', protect, updateProfile);
router.post('/avatar', protect, uploadAvatarMiddleware, uploadAvatar);

module.exports = router;
