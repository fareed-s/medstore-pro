const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — comma-separated list of allowed origins (defaults to local Vite dev server)
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

// Body parsing — 25mb covers most bulk uploads; the master-catalog upload
// chunks itself client-side so even bigger files come in as small requests.
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Static uploads — robust custom handler ────────────────────────────────
// We replaced `express.static` here because in Docker bind-mounted volumes
// it sometimes 404'd files that genuinely existed on disk (newly-written
// avatars in particular). This handler does an explicit fs.access on every
// request, streams the file fresh, and never caches a 404 in the browser
// (so the next page reload re-tries instead of getting a phantom failure).
const UPLOADS_ROOT = path.join(__dirname, 'uploads');
app.use('/uploads', async (req, res, next) => {
  // Guard against path traversal — only allow paths that resolve INSIDE
  // the uploads root. decodeURIComponent because filenames may have
  // url-encoded characters.
  let rel;
  try { rel = decodeURIComponent(req.path); }
  catch { return res.status(400).end(); }

  const absPath = path.join(UPLOADS_ROOT, rel);
  if (!absPath.startsWith(UPLOADS_ROOT)) {
    return res.status(400).end();
  }

  try {
    await fs.promises.access(absPath, fs.constants.R_OK);
  } catch {
    // 404 — but tell the browser NOT to cache, so a re-upload that creates
    // the same filename starts working immediately on next request.
    res.set('Cache-Control', 'no-store, must-revalidate');
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[uploads] 404 ${rel}`);
    }
    return res.status(404).json({ success: false, message: 'File not found', path: rel });
  }

  // Found — stream it. Disable etag/lastModified to avoid 304s while we're
  // shaking out edge cases; static images are tiny so the bandwidth cost is
  // negligible.
  res.set('Cache-Control', 'public, max-age=300');
  res.sendFile(absPath, { etag: false, lastModified: false }, (err) => {
    if (err && !res.headersSent) next(err);
  });
});

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
app.use('/api/controlled', require('./routes/controlled.routes'));

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

// Auto-suspend stores whose plan has expired. Runs daily at 1 AM. The auth
// middleware also lazily auto-suspends on the next request, so this job is
// belt-and-braces — it just ensures the dashboard list is accurate even if
// no one from the store logs in.
cron.schedule('0 1 * * *', async () => {
  try {
    const Store = require('./models/Store');
    const result = await Store.updateMany(
      { isActive: true, planEndDate: { $lt: new Date() } },
      { $set: { isActive: false, suspendedReason: 'Plan expired', suspendedAt: new Date() } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[CRON] Auto-suspended ${result.modifiedCount} expired store(s)`);
    }
  } catch (error) {
    console.error('[CRON] Plan-expiry check failed:', error);
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
