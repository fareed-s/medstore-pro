import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { toast } from 'react-toastify';
import { HiOutlinePlus } from 'react-icons/hi';
import { apiError, formatCurrency } from '../../utils/helpers';
import { confirmDanger } from '../../utils/swal';
import {
  fetchExpenses, fetchExpensesSummary, deleteExpenseThunk,
  selectExpensesSummary,
} from './expensesSlice';
import ExpenseSummary from './components/ExpenseSummary';
import ExpenseForm from './components/ExpenseForm';
import ExpenseTable from './components/ExpenseTable';

export default function ExpensesPage() {
  const dispatch = useDispatch();
  const summary = useSelector(selectExpensesSummary, shallowEqual);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    dispatch(fetchExpenses());
    dispatch(fetchExpensesSummary());
  }, [dispatch]);

  const onDelete = useCallback(async (id) => {
    if (!(await confirmDanger('This expense will be permanently removed.', { title: 'Delete expense?', confirmText: 'Delete' }))) return;
    try {
      await dispatch(deleteExpenseThunk(id)).unwrap();
      dispatch(fetchExpensesSummary());
      toast.success('Deleted');
    } catch (err) { toast.error(apiError(err)); }
  }, [dispatch]);

  const closeForm = useCallback(() => setShowForm(false), []);
  const toggleForm = useCallback(() => setShowForm((v) => !v), []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm">Total: {formatCurrency(summary?.total || 0)}</p>
        </div>
        <button onClick={toggleForm} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Add Expense
        </button>
      </div>
      <ExpenseSummary />
      {showForm && <ExpenseForm onClose={closeForm} />}
      <ExpenseTable onDelete={onDelete} />
    </div>
  );
}
