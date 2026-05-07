const { asyncHandler } = require('../utils/errorHandler');
const ControlledModuleSettings = require('../models/ControlledModuleSettings');
const { sign, logEvent, MODULE_TOKEN_TTL } = require('../middleware/controlledAccess');

const MAX_FAILS = 5;
const LOCK_MINUTES = 30;

// Tells the frontend whether the lock icon should even appear.
// SAFE to call from any logged-in user — leaks no secrets.
//
//  - enabled:        module is on for this store
//  - inspection:     panic-mode active → frontend must HIDE the icon completely
//  - canUnlock:      this specific user is permitted to attempt unlock
//  - lockedUntil:    brute-force lockout end (if any)
//  - hasPassword:    SuperAdmin has set the unlock password
//
// @route GET /api/controlled/auth/status
exports.status = asyncHandler(async (req, res) => {
  if (req.user.role === 'SuperAdmin') {
    // SuperAdmin doesn't use the per-store hidden module — they manage it.
    return res.json({
      success: true,
      data: { enabled: false, inspection: false, canUnlock: false, hasPassword: false },
    });
  }

  const settings = await ControlledModuleSettings.findOne({ storeId: req.user.storeId })
    .select('+passwordHash');

  if (!settings || !settings.enabled) {
    return res.json({
      success: true,
      data: { enabled: false, inspection: false, canUnlock: false, hasPassword: false },
    });
  }
  if (settings.inspectionMode) {
    // Pretend it's not there. Frontend treats this identically to disabled
    // and won't show the lock icon at all.
    return res.json({
      success: true,
      data: { enabled: false, inspection: true, canUnlock: false, hasPassword: false },
    });
  }

  const canUnlock =
    req.user.role === 'StoreAdmin' ||
    settings.allowedUserIds.some((id) => String(id) === String(req.user._id));

  res.json({
    success: true,
    data: {
      enabled: true,
      inspection: false,
      canUnlock,
      hasPassword: !!settings.passwordHash,
      lockedUntil: settings.lockedUntil && settings.lockedUntil > new Date()
        ? settings.lockedUntil : null,
    },
  });
});

// Verify the module password and (on success) issue a 15-minute module token.
// @route POST /api/controlled/auth/unlock   body: { password }
exports.unlock = asyncHandler(async (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password required' });
  }
  if (req.user.role === 'SuperAdmin') {
    return res.status(403).json({ success: false, message: 'SuperAdmin manages this module — cannot unlock as user.' });
  }

  const settings = await ControlledModuleSettings.findOne({ storeId: req.user.storeId })
    .select('+passwordHash');

  if (!settings || !settings.enabled) {
    await logEvent(req, 'unlock_blocked', { reason: 'module disabled' });
    return res.status(403).json({ success: false, message: 'Module is not enabled' });
  }
  if (settings.inspectionMode) {
    await logEvent(req, 'unlock_blocked', { reason: 'inspection mode' });
    return res.status(403).json({ success: false, message: 'Module unavailable' });
  }
  if (!settings.passwordHash) {
    await logEvent(req, 'unlock_blocked', { reason: 'no password set' });
    return res.status(403).json({ success: false, message: 'Module password not set. Contact platform administrator.' });
  }
  if (settings.lockedUntil && settings.lockedUntil > new Date()) {
    await logEvent(req, 'unlock_blocked', { reason: 'locked out' });
    const mins = Math.ceil((settings.lockedUntil - new Date()) / 60000);
    return res.status(429).json({ success: false, message: `Too many attempts. Try again in ${mins} min.` });
  }

  const isAllowed =
    req.user.role === 'StoreAdmin' ||
    settings.allowedUserIds.some((id) => String(id) === String(req.user._id));
  if (!isAllowed) {
    await logEvent(req, 'unlock_blocked', { reason: 'user not in allow-list' });
    return res.status(403).json({ success: false, message: 'You are not authorised for this module' });
  }

  const ok = await settings.verifyPassword(password);
  if (!ok) {
    settings.failedAttempts = (settings.failedAttempts || 0) + 1;
    if (settings.failedAttempts >= MAX_FAILS) {
      settings.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    }
    await settings.save();
    await logEvent(req, 'unlock_failed', {
      reason: `wrong password (${settings.failedAttempts}/${MAX_FAILS})`,
    });
    return res.status(401).json({
      success: false,
      message: settings.failedAttempts >= MAX_FAILS
        ? `Too many attempts. Locked for ${LOCK_MINUTES} minutes.`
        : 'Incorrect password',
      attemptsLeft: Math.max(0, MAX_FAILS - settings.failedAttempts),
    });
  }

  // Success — reset counters, issue token.
  settings.failedAttempts = 0;
  settings.lockedUntil = undefined;
  await settings.save();

  const token = sign({
    userId: req.user._id,
    storeId: req.user.storeId,
    role: req.user.role,
  });

  await logEvent(req, 'unlock_success');

  res.json({
    success: true,
    token,
    expiresIn: MODULE_TOKEN_TTL,
  });
});

// Explicit lock — frontend calls this on Quick Exit, idle timeout, and tab
// close (best-effort beacon). The token is short-lived anyway, but logging
// the intent gives a cleaner audit trail.
// @route POST /api/controlled/auth/lock
exports.lock = asyncHandler(async (req, res) => {
  await logEvent(req, 'lock', { reason: req.body?.reason || 'user-initiated' });
  res.json({ success: true });
});

// Panic button: any allowed user can FLIP inspection mode ON for their own
// store. This is intentionally one-way — turning it back OFF is SuperAdmin
// only. The point is to instantly hide the entire module during a regulatory
// raid without needing to phone the platform administrator.
// @route POST /api/controlled/auth/inspection-on
exports.activateInspectionMode = asyncHandler(async (req, res) => {
  if (req.user.role === 'SuperAdmin' || !req.user.storeId) {
    return res.status(403).json({ success: false, message: 'Not applicable for this account' });
  }

  const ControlledModuleSettings = require('../models/ControlledModuleSettings');
  const settings = await ControlledModuleSettings.findOne({ storeId: req.user.storeId });
  if (!settings || !settings.enabled) {
    return res.status(403).json({ success: false, message: 'Module is not enabled' });
  }

  // Allow-list check — only users who can normally unlock should be able to
  // trigger the panic button. Otherwise a Cashier could nuke the module.
  const isAllowed =
    req.user.role === 'StoreAdmin' ||
    settings.allowedUserIds.some((id) => String(id) === String(req.user._id));
  if (!isAllowed) {
    return res.status(403).json({ success: false, message: 'Not authorised' });
  }

  settings.inspectionMode = true;
  settings.inspectionModeAt = new Date();
  await settings.save();

  await logEvent(req, 'inspection_on', { reason: 'panic button (user-triggered)' });

  res.json({ success: true });
});
