const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['low_stock', 'expiring_soon', 'expired', 'payment_due', 'prescription_refill', 'po_received', 'dl_expiry', 'system', 'info'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  isRead: { type: Boolean, default: false },
  entityId: mongoose.Schema.Types.ObjectId,
  entityType: String,
  link: String,
}, {
  timestamps: true,
});

notificationSchema.index({ storeId: 1, userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
