const { asyncHandler } = require('../utils/errorHandler');
const ControlledAccessLog = require('../models/ControlledAccessLog');

// Read-only access-log viewer for users INSIDE the module. Useful for
// StoreAdmins to self-audit. Cannot be filtered to "show only my actions"
// — auditability requires a complete view to whoever has access.
//
// SuperAdmin uses /api/superadmin/.../logs which is identical in shape.

// @route   GET /api/controlled/logs
exports.list = asyncHandler(async (req, res) => {
  const { event, page = 1, limit = 100 } = req.query;
  const filter = { storeId: req.user.storeId };
  if (event) filter.event = event;

  const [total, logs] = await Promise.all([
    ControlledAccessLog.countDocuments(filter),
    ControlledAccessLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: { total, page: parseInt(page), limit: parseInt(limit) },
  });
});
