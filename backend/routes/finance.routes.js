const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/finance.controller');

router.use(protect);

// Cash Register
router.get('/register', ctrl.getOpenRegister);
router.post('/register/open', ctrl.openRegister);
router.post('/register/transaction', ctrl.addTransaction);
router.post('/register/close', ctrl.closeRegister);
router.get('/register/history', ctrl.getRegisterHistory);

// Expenses
router.get('/expenses', ctrl.getExpenses);
router.post('/expenses', authorize('SuperAdmin', 'StoreAdmin'), ctrl.createExpense);
router.put('/expenses/:id', authorize('SuperAdmin', 'StoreAdmin'), ctrl.updateExpense);
router.delete('/expenses/:id', authorize('SuperAdmin', 'StoreAdmin'), ctrl.deleteExpense);
router.get('/expenses/summary', ctrl.getExpenseSummary);

// Reports
router.get('/profit-loss', authorize('SuperAdmin', 'StoreAdmin'), ctrl.getProfitAndLoss);
router.get('/tax-report', authorize('SuperAdmin', 'StoreAdmin'), ctrl.getTaxReport);
router.get('/accounts-payable', authorize('SuperAdmin', 'StoreAdmin'), ctrl.getAccountsPayable);
router.get('/accounts-receivable', authorize('SuperAdmin', 'StoreAdmin'), ctrl.getAccountsReceivable);
router.get('/daily-collection', ctrl.getDailyCollection);

module.exports = router;
