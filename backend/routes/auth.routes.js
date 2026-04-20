const router = require('express').Router();
const { register, login, getMe, logout, updatePassword, updateProfile } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validate, registerStoreSchema, loginSchema } = require('../middleware/validate');

router.post('/register', validate(registerStoreSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/password', protect, updatePassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
