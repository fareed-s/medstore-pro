const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, lowercase: true },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  description: String,
  icon: String,
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  productCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

categorySchema.index({ storeId: 1, name: 1 }, { unique: true });
categorySchema.index({ storeId: 1, parentCategory: 1 });

module.exports = mongoose.model('Category', categorySchema);
