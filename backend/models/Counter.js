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

// Atomically get next number
counterSchema.statics.getNext = async function (storeId, type, prefix = 'INV') {
  const counter = await this.findOneAndUpdate(
    { storeId, type },
    { $inc: { currentValue: 1 }, $setOnInsert: { prefix } },
    { new: true, upsert: true }
  );
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${prefix}-${y}${m}-${String(counter.currentValue).padStart(5, '0')}`;
};

module.exports = mongoose.model('Counter', counterSchema);
