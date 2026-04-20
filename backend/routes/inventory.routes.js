// INVENTORY ROUTES
const invRouter = require('express').Router();
const { protect } = require('../middleware/auth');
const invCtrl = require('../controllers/inventory.controller');
invRouter.use(protect);
invRouter.get('/overview', invCtrl.getInventoryOverview);
invRouter.get('/category-stock', invCtrl.getCategoryStock);
module.exports = invRouter;
