const jwt = require('jsonwebtoken');
const ControlledModuleSettings = require('../models/ControlledModuleSettings');
const ControlledAccessLog = require('../models/ControlledAccessLog');

// The module uses a SECOND, short-lived JWT distinct from the main login
// token. This way the main session can stay alive for days while the
// "narcotic vault" auto-locks after 15 minutes. The token is signed with the
// same JWT_SECRET but tagged with `scope: 'controlled-module'` so a regular
// login token cannot accidentally unlock the module.
const MODULE_TOKEN_TTL = '15m';
const MODULE_TOKEN_SCOPE = 'controlled-module';

const sign = (payload) => jwt.sign(
  { ...payload, scope: MODULE_TOKEN_SCOPE },
  process.env.JWT_SECRET,
  { expiresIn: MODULE_TOKEN_TTL }
);

const verify = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.scope !== MODULE_TOKEN_SCOPE) {
    throw new Error('wrong scope');
  }
  return decoded;
};

const extractToken = (req) => {
  // Prefer dedicated header so a leaked main JWT in the cookie can't unlock.
  const h = req.headers['x-controlled-token'];
  if (h) return h;
  if (req.headers.authorization?.startsWith('Module ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

// Best-effort logger — never throw, never block the response.
const logEvent = async (req, event, extra = {}) => {
  try {
    await ControlledAccessLog.create({
      storeId: extra.storeId || req.user?.storeId || null,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userName: req.user?.name,
      event,
      route: extra.route || `${req.method} ${req.originalUrl}`,
      reason: extra.reason,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } catch (err) {
    console.error('[ControlledAccessLog] write failed:', err.message);
  }
};

// Guard for every /api/controlled/* route except auth (unlock/status).
// Requires:
//   1. main login already done (req.user populated by `protect`)
//   2. valid module-scoped JWT in x-controlled-token header
//   3. module enabled for the store, NOT in inspection mode
//   4. user is allowed (StoreAdmin/SuperAdmin or in allowedUserIds)
const requireUnlocked = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Login required' });
  }

  const storeId = req.user.storeId;
  if (!storeId && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ success: false, message: 'No store context' });
  }

  const token = extractToken(req);
  if (!token) {
    await logEvent(req, 'access_denied', { reason: 'no module token' });
    return res.status(401).json({ success: false, message: 'Module locked', code: 'MODULE_LOCKED' });
  }

  let decoded;
  try {
    decoded = verify(token);
  } catch {
    await logEvent(req, 'access_denied', { reason: 'invalid/expired module token' });
    return res.status(401).json({ success: false, message: 'Module session expired', code: 'MODULE_LOCKED' });
  }

  // Token must belong to the same user/store that's calling.
  if (String(decoded.userId) !== String(req.user._id) ||
      String(decoded.storeId || '') !== String(storeId || '')) {
    await logEvent(req, 'access_denied', { reason: 'token user/store mismatch' });
    return res.status(401).json({ success: false, message: 'Module session invalid', code: 'MODULE_LOCKED' });
  }

  // Verify settings still permit access (could have been disabled mid-session).
  const settings = await ControlledModuleSettings.findOne({ storeId });
  if (!settings || !settings.enabled) {
    await logEvent(req, 'access_denied', { storeId, reason: 'module disabled' });
    return res.status(403).json({ success: false, message: 'Module is disabled', code: 'MODULE_DISABLED' });
  }
  if (settings.inspectionMode) {
    await logEvent(req, 'access_denied', { storeId, reason: 'inspection mode' });
    return res.status(403).json({ success: false, message: 'Module unavailable', code: 'MODULE_INSPECTION' });
  }

  const isAllowed =
    req.user.role === 'SuperAdmin' ||
    req.user.role === 'StoreAdmin' ||
    settings.allowedUserIds.some((id) => String(id) === String(req.user._id));
  if (!isAllowed) {
    await logEvent(req, 'access_denied', { storeId, reason: 'user not in allow-list' });
    return res.status(403).json({ success: false, message: 'Not authorised for this module', code: 'MODULE_FORBIDDEN' });
  }

  req.controlledSettings = settings;

  // Record the successful access. Keep this lightweight — fire & forget.
  logEvent(req, 'access', { storeId });

  next();
};

module.exports = {
  sign,
  verify,
  extractToken,
  logEvent,
  requireUnlocked,
  MODULE_TOKEN_TTL,
};
