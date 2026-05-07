const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Per-store config for the hidden Controlled/Narcotic Drugs module.
// Created on demand the first time SuperAdmin enables it for a store.
//
//  • passwordHash — separate from any login password. Used to "unlock" the
//    hidden module. Stored hashed; raw password never persisted.
//  • allowedUserIds — only these users (in addition to StoreAdmin / SuperAdmin)
//    can unlock the module. Empty array = StoreAdmin only.
//  • inspectionMode — "panic" toggle. When true the lock icon disappears from
//    the UI and unlock attempts are rejected, so during a regulatory raid the
//    entire module can be hidden in one click.
//  • failedAttempts / lockedUntil — brute-force protection on unlock.
const controlledModuleSettingsSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },

  enabled: { type: Boolean, default: false },
  passwordHash: { type: String, select: false },
  passwordSetAt: Date,

  allowedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  inspectionMode: { type: Boolean, default: false },
  inspectionModeAt: Date,

  failedAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
}, {
  timestamps: true,
});

controlledModuleSettingsSchema.methods.setPassword = async function (raw) {
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(raw, salt);
  this.passwordSetAt = new Date();
  this.failedAttempts = 0;
  this.lockedUntil = undefined;
};

controlledModuleSettingsSchema.methods.verifyPassword = async function (raw) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(raw, this.passwordHash);
};

module.exports = mongoose.model('ControlledModuleSettings', controlledModuleSettingsSchema);
