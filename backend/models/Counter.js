const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  type: { type: String, required: true }, // 'sale', 'return', 'po', 'grn'
  prefix: { type: String, default: 'INV' },
  currentValue: { type: Number, default: 0 },
}, {
  timestamps: true,
});

counterSchema.index({ storeId: 1, type: 1 }, { unique: true });

const monthPrefix = (prefix) => {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${prefix}-${y}${m}-`;
};

const formatInvoice = (prefix, num) =>
  `${monthPrefix(prefix)}${String(num).padStart(5, '0')}`;

// Atomically increment and return next formatted number.
counterSchema.statics.getNext = async function (storeId, type, prefix = 'INV') {
  const counter = await this.findOneAndUpdate(
    { storeId, type },
    { $inc: { currentValue: 1 }, $setOnInsert: { prefix } },
    { new: true, upsert: true }
  );
  return formatInvoice(prefix, counter.currentValue);
};

// Pull counter forward so currentValue >= the highest number already present in
// `Model.field` for this store + current month. Idempotent ($max never goes down).
counterSchema.statics.bumpToMaxFromCollection = async function (storeId, type, prefix, Model, field) {
  const mp = monthPrefix(prefix);
  const last = await Model.findOne(
    { storeId, [field]: { $regex: `^${mp}` } },
    { [field]: 1 }
  ).sort({ [field]: -1 });

  if (!last || !last[field]) return 0;
  const num = parseInt(String(last[field]).split('-').pop(), 10);
  if (!Number.isFinite(num)) return 0;

  await this.updateOne(
    { storeId, type },
    { $max: { currentValue: num }, $setOnInsert: { prefix } },
    { upsert: true }
  );
  return num;
};

// Generate a number guaranteed not to clash with existing `Model.field` rows.
// If the counter is behind (e.g. after a reseed or a stray write), this catches up.
counterSchema.statics.getNextUnique = async function (storeId, type, prefix, Model, field, maxRetries = 15) {
  for (let i = 0; i < maxRetries; i++) {
    const candidate = await this.getNext(storeId, type, prefix);
    const clash = await Model.exists({ storeId, [field]: candidate });
    if (!clash) return candidate;
    await this.bumpToMaxFromCollection(storeId, type, prefix, Model, field);
  }
  throw new Error(`Could not generate a unique ${prefix} number after ${maxRetries} attempts`);
};

module.exports = mongoose.model('Counter', counterSchema);
