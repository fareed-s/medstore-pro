import { memo } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import Spinner from '../../../shared/components/Spinner';
import ExpenseRow from './ExpenseRow';
import { selectExpenseIds, selectExpensesStatus } from '../expensesSlice';

function ExpenseTable({ onDelete }) {
  const ids = useSelector(selectExpenseIds, shallowEqual);
  const status = useSelector(selectExpensesStatus);

  return (
    <div className="card overflow-hidden p-0">
      {status === 'loading' ? <Spinner /> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 hidden md:table-cell">Method</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 hidden md:table-cell">By</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ids.length === 0
              ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No expenses yet.</td></tr>
              : ids.map((id) => <ExpenseRow key={id} expenseId={id} onDelete={onDelete} />)}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default memo(ExpenseTable);
