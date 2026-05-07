const mongoose = require('mongoose');

// Immutable audit trail for the hidden Controlled-Drugs module. Every
// unlock attempt (success or fail), every action, every lock — logged here.
//
// Intentionally NOT exposed via any DELETE endpoint. The only way to clear
// these records is direct DB access, which is itself audited at infra level.
const controlledAccessLogSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },

  // Best-effort actor — a failed unlock with no JWT will still log userId
  // from the main login token, so we always know "who tried".
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: String,
  userName: String,

  // What happened
  event: {
    type: String,
    enum: [
      'unlock_success',
      'unlock_failed',          // wrong password
      'unlock_blocked',         // module disabled / inspection mode / user not allowed / locked out
      'lock',                   // explicit lock or auto-lock on idle
      'access',                 // successful API hit inside the module (route + method)
      'access_denied',          // hit without valid module session
      'password_set',           // SuperAdmin changed password
      'enabled', 'disabled',    // SuperAdmin toggle
      'inspection_on', 'inspection_off',
      'user_allowed', 'user_revoked',
    ],
    required: true,
  },

  // Optional details
  route: String,        // e.g. "POST /api/controlled/medicines"
  reason: String,       // human-readable, e.g. "wrong password (3/5)"

  ipAddress: String,
  userAgent: String,
}, {
  timestamps: true,
  // Immutable: prevent any update. Defense-in-depth — we don't expose update
  // routes, but blocking at the ORM level catches accidental edits too.
  strict: 'throw',
});

controlledAccessLogSchema.index({ storeId: 1, createdAt: -1 });
controlledAccessLogSchema.index({ storeId: 1, event: 1, createdAt: -1 });
controlledAccessLogSchema.index({ storeId: 1, userId: 1, createdAt: -1 });

// Block .save() on existing docs and any updateXxx call — once written, locked.
controlledAccessLogSchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error('ControlledAccessLog is immutable'));
  next();
});
['updateOne', 'updateMany', 'findOneAndUpdate', 'findByIdAndUpdate'].forEach((op) => {
  controlledAccessLogSchema.pre(op, function (next) {
    next(new Error('ControlledAccessLog is immutable'));
  });
});

module.exports = mongoose.model('ControlledAccessLog', controlledAccessLogSchema);
