import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiOutlineEye, HiOutlineBan, HiOutlineReceiptRefund } from 'react-icons/hi';
import { formatCurrency, formatDateTime } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import { makeSelectSaleById } from '../salesSlice';

const STATUS_BADGE = {
  completed: 'badge-green', held: 'badge-amber', voided: 'badge-red',
  returned:  'badge-gray',  partial_return: 'badge-blue',
};

function SaleRow({ saleId, onVoid }) {
  const { hasRole } = useAuth();
  const sale = useSelector(makeSelectSaleById(saleId));
  const handleVoid = useCallback(() => onVoid?.(saleId), [onVoid, saleId]);

  if (!sale) return null;

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-bold text-primary-600">{sale.invoiceNo}</span>
        <p className="text-[10px] text-gray-400">{sale.cashierName}</p>
      </td>
      <td className="px-4 py-3 font-medium">{sale.customerName}</td>
      <td className="px-4 py-3 hidden md:table-cell text-gray-500">{sale.items?.length}</td>
      <td className="px-4 py-3 font-bold">{formatCurrency(sale.netTotal)}</td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="badge badge-gray">{sale.payments?.[0]?.method || '—'}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`badge ${STATUS_BADGE[sale.status] || 'badge-gray'}`}>{sale.status}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDateTime(sale.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Link to={`/sales/${sale._id}`} className="p-1.5 hover:bg-gray-100 rounded-lg" title="View">
            <HiOutlineEye className="w-4 h-4 text-gray-500" />
          </Link>
          {sale.status === 'completed' && hasRole('SuperAdmin', 'StoreAdmin', 'Pharmacist') && (
            <>
              <button onClick={handleVoid} className="p-1.5 hover:bg-red-50 rounded-lg" title="Void">
                <HiOutlineBan className="w-4 h-4 text-red-400" />
              </button>
              <Link to={`/sales/${sale._id}/return`} className="p-1.5 hover:bg-blue-50 rounded-lg" title="Return">
                <HiOutlineReceiptRefund className="w-4 h-4 text-blue-400" />
              </Link>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default memo(SaleRow);
