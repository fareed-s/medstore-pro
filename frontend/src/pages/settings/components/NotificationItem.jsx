import { memo, useCallback } from 'react';
import { HiOutlineCheck, HiOutlineTrash } from 'react-icons/hi';
import { timeAgo } from '../../../utils/helpers';

const TYPE_ICONS = {
  low_stock:     { icon: '📦', color: 'bg-amber-50 text-amber-600' },
  expiring_soon: { icon: '⏰', color: 'bg-orange-50 text-orange-600' },
  expired:       { icon: '❌', color: 'bg-red-50 text-red-600' },
  payment_due:   { icon: '💰', color: 'bg-blue-50 text-blue-600' },
  dl_expiry:     { icon: '📋', color: 'bg-purple-50 text-purple-600' },
  system:        { icon: '⚙️', color: 'bg-gray-50 text-gray-600' },
  info:          { icon: 'ℹ️', color: 'bg-blue-50 text-blue-600' },
};

function NotificationItem({ notification: n, onMarkRead, onDelete }) {
  const handleRead   = useCallback(() => onMarkRead(n._id), [onMarkRead, n._id]);
  const handleDelete = useCallback(() => onDelete(n._id),   [onDelete,   n._id]);
  const t = TYPE_ICONS[n.type] || TYPE_ICONS.info;

  return (
    <div className={`card flex items-start gap-3 group transition-all ${!n.isRead ? 'border-l-4 border-primary-500 bg-primary-50/20' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.color}`}>
        <span className="text-lg">{t.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
        {n.priority === 'critical' && <span className="badge badge-red text-[9px] mt-1">CRITICAL</span>}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!n.isRead && (
          <button onClick={handleRead} className="p-1.5 hover:bg-green-50 rounded-lg">
            <HiOutlineCheck className="w-4 h-4 text-green-500" />
          </button>
        )}
        <button onClick={handleDelete} className="p-1.5 hover:bg-red-50 rounded-lg">
          <HiOutlineTrash className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}

export default memo(NotificationItem);
