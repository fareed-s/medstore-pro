const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — production supports Vercel frontend
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: function (origin, callback) {
    // Allow no-origin requests (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/stores', require('./routes/store.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/medicines', require('./routes/medicine.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/batches', require('./routes/batch.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/inventory-v2', require('./routes/inventory-v2.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/sales', require('./routes/sale.routes'));
app.use('/api/purchase', require('./routes/purchase.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/prescriptions', require('./routes/prescription.routes'));
app.use('/api/finance', require('./routes/finance.routes'));
app.use('/api/regulatory', require('./routes/regulatory.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/activity-logs', require('./routes/activitylog.routes'));
app.use('/api/transfers', require('./routes/transfer.routes'));
app.use('/api/superadmin', require('./routes/superadmin.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Cron Jobs
// Check expiring medicines daily at 8 AM
cron.schedule('0 8 * * *', async () => {
  try {
    const Batch = require('./models/Batch');
    const { addDays } = require('date-fns');
    const expiringBatches = await Batch.find({
      expiryDate: { $lte: addDays(new Date(), 30) },
      remainingQty: { $gt: 0 },
      isExpired: false,
    }).populate('medicineId', 'medicineName');
    console.log(`[CRON] Found ${expiringBatches.length} batches expiring within 30 days`);
  } catch (error) {
    console.error('[CRON] Expiry check failed:', error);
  }
});

// Connect DB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(PORT, () => {
      console.log(`MedStore Pro API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
