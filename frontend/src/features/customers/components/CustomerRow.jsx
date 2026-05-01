import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiOutlineExclamation, HiOutlineEye } from 'react-icons/hi';
import { formatCurrency } from '../../../utils/helpers';
import { makeSelectCustomerById } from '../customersSlice';

const TIER_COLOR = {
  Bronze:   'text-amber-700 bg-amber-50',
  Silver:   'text-gray-500 bg-gray-100',
  Gold:     'text-yellow-600 bg-yellow-50',
  Platinum: 'text-purple-600 bg-purple-50',
};

// Each row subscribes only to its own customer. When the parent list grows or
// any other row updates, this component does NOT re-render — only when its own
// data actually changes.
function CustomerRow({ customerId, onEdit }) {
  const customer = useSelector(makeSelectCustomerById(customerId));
  const handleEdit = useCallback(() => onEdit?.(customerId), [onEdit, customerId]);

  if (!customer) return null;
  const c = customer;

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900">{c.customerName}</p>
        <p className="text-xs text-gray-400">{c.phone}</p>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="badge badge-blue text-[10px]">{c.customerType}</span>
      </td>
      <td className="px-4 py-3 text-right">
        {c.currentBalance > 0
          ? <span className="font-bold text-red-600">{formatCurrency(c.currentBalance)}</span>
          : <span className="text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className={`badge text-[10px] ${TIER_COLOR[c.loyaltyTier] || ''}`}>
          {c.loyaltyTier} • {c.loyaltyPoints}pts
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-gray-500">{formatCurrency(c.totalSpent)}</td>
      <td className="px-4 py-3 hidden md:table-cell">
        {c.allergies?.length > 0 ? (
          <span className="badge badge-red text-[10px] flex items-center gap-0.5">
            <HiOutlineExclamation className="w-3 h-3" />
            {c.allergies.length} allergies
          </span>
        ) : <span className="text-gray-300 text-xs">None</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Link to={`/customers/${c._id}`} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <HiOutlineEye className="w-4 h-4 text-gray-500" />
          </Link>
          {onEdit && (
            <button onClick={handleEdit} className="text-xs text-primary-600 font-medium hover:underline">
              Edit
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default memo(CustomerRow);
