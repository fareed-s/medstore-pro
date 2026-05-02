const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Avatar uploads land in /backend/uploads/avatars and are served from /uploads
// (configured in server.js). Filename: <userId>-<timestamp>.<ext> so old
// avatars are overwritten naturally when a user re-uploads.
const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.\w]/g, '') || '.jpg';
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG / PNG / WEBP / GIF images are allowed'));
};

exports.uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB — avatars don't need to be huge
}).single('avatar');

// ── Store logo uploads ──────────────────────────────────────────────────────
// Same disk-storage pattern as avatars but in /uploads/logos. Filename:
// <storeId>-<timestamp>.<ext> so re-uploads create a new URL (cache-busts
// any cached version on the receipt previews).
const LOGO_DIR = path.join(__dirname, '..', 'uploads', 'logos');
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.\w]/g, '') || '.png';
    cb(null, `${req.user.storeId}-${Date.now()}${ext}`);
  },
});

exports.uploadLogo = multer({
  storage: logoStorage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB — logos can be a touch bigger
}).single('logo');
