import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineEye, HiOutlinePaperAirplane, HiOutlineBan } from 'react-icons/hi';
import { formatCurrency, formatDate } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';

const STATUS_BADGE = {
  draft: 'badge-gray', sent: 'badge-blue', partial: 'badge-amber',
  received: 'badge-green', cancelled: 'badge-red',
};

function PurchaseOrderRow({ order: po, onSend, onCancel }) {
  const { hasRole } = useAuth();
  const canManage = hasRole('SuperAdmin', 'StoreAdmin');
  const handleSend   = useCallback(() => onSend(po._id),   [onSend,   po._id]);
  const handleCancel = useCallback(() => onCancel(po._id), [onCancel, po._id]);

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-3 font-mono text-xs font-bold text-primary-600">{po.poNumber}</td>
      <td className="px-4 py-3 font-medium">{po.supplierName || po.supplierId?.supplierName}</td>
      <td className="px-4 py-3 hidden md:table-cell text-gray-500">{po.items?.length}</td>
      <td className="px-4 py-3 text-right font-bold">{formatCurrency(po.grandTotal)}</td>
      <td className="px-4 py-3"><span className={`badge ${STATUS_BADGE[po.status]}`}>{po.status}</span></td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDate(po.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Link to={`/purchase/orders/${po._id}`} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <HiOutlineEye className="w-4 h-4 text-gray-500" />
          </Link>
          {po.status === 'draft' && canManage && (
            <button onClick={handleSend} className="p-1.5 hover:bg-blue-50 rounded-lg" title="Mark as Sent">
              <HiOutlinePaperAirplane className="w-4 h-4 text-blue-500" />
            </button>
          )}
          {['draft', 'sent'].includes(po.status) && canManage && (
            <button onClick={handleCancel} className="p-1.5 hover:bg-red-50 rounded-lg" title="Cancel">
              <HiOutlineBan className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default memo(PurchaseOrderRow);
