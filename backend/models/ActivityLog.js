const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  module: {
    type: String,
    enum: ['auth', 'store', 'medicine', 'inventory', 'batch', 'category', 'sale', 'purchase', 'customer', 'prescription', 'expense', 'settings', 'user', 'report'],
    required: true,
  },
  details: String,
  entityId: mongoose.Schema.Types.ObjectId,
  entityType: String,
  oldValues: mongoose.Schema.Types.Mixed,
  newValues: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
}, {
  timestamps: true,
});

activityLogSchema.index({ storeId: 1, createdAt: -1 });
activityLogSchema.index({ storeId: 1, module: 1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
