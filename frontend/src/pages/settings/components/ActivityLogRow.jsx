import { memo } from 'react';
import { formatDateTime } from '../../../utils/helpers';

const MODULE_BADGE = {
  auth: 'badge-blue', sale: 'badge-green', medicine: 'badge-amber',
  purchase: 'badge-blue', inventory: 'badge-amber', customer: 'badge-green',
  expense: 'bg-red-100 text-red-700',
};

function ActivityLogRow({ log }) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-2 text-xs text-gray-500">{formatDateTime(log.createdAt)}</td>
      <td className="px-4 py-2 text-xs font-medium">{log.userId?.name || '—'}</td>
      <td className="px-4 py-2"><span className={`badge text-[10px] ${MODULE_BADGE[log.module] || 'badge-gray'}`}>{log.module}</span></td>
      <td className="px-4 py-2 text-xs">{log.action}</td>
      <td className="px-4 py-2 hidden lg:table-cell text-xs text-gray-400 max-w-xs truncate">{log.details}</td>
    </tr>
  );
}

export default memo(ActivityLogRow);
