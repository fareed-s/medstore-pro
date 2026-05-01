import { memo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { HiOutlineTrash } from 'react-icons/hi';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { makeSelectExpenseById } from '../expensesSlice';

function ExpenseRow({ expenseId, onDelete }) {
  const exp = useSelector(makeSelectExpenseById(expenseId));
  const handleDelete = useCallback(() => onDelete?.(expenseId), [onDelete, expenseId]);
  if (!exp) return null;

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-2 text-xs text-gray-500">{formatDate(exp.date)}</td>
      <td className="px-4 py-2"><span className="badge badge-gray text-[10px]">{exp.category}</span></td>
      <td className="px-4 py-2 text-gray-700">{exp.description}</td>
      <td className="px-4 py-2 hidden md:table-cell text-xs text-gray-400">{exp.paymentMethod}</td>
      <td className="px-4 py-2 text-right font-bold text-red-600">{formatCurrency(exp.amount)}</td>
      <td className="px-4 py-2 hidden md:table-cell text-xs text-gray-400">{exp.addedBy?.name}</td>
      <td className="px-4 py-2">
        <button onClick={handleDelete} className="p-1 hover:bg-red-50 rounded">
          <HiOutlineTrash className="w-3.5 h-3.5 text-red-400" />
        </button>
      </td>
    </tr>
  );
}

export default memo(ExpenseRow);
