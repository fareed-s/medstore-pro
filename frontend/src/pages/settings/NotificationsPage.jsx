import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { timeAgo } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlineBell, HiOutlineCheck, HiOutlineTrash, HiOutlineExclamation } from 'react-icons/hi';

const typeIcons = {
  low_stock: { icon: '📦', color: 'bg-amber-50 text-amber-600' },
  expiring_soon: { icon: '⏰', color: 'bg-orange-50 text-orange-600' },
  expired: { icon: '❌', color: 'bg-red-50 text-red-600' },
  payment_due: { icon: '💰', color: 'bg-blue-50 text-blue-600' },
  dl_expiry: { icon: '📋', color: 'bg-purple-50 text-purple-600' },
  system: { icon: '⚙️', color: 'bg-gray-50 text-gray-600' },
  info: { icon: 'ℹ️', color: 'bg-blue-50 text-blue-600' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await API.get('/notifications');
      setNotifications(data.data);
      setUnread(data.unread);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const markRead = async (id) => {
    await API.put(`/notifications/${id}/read`);
    setNotifications(n => n.map(x => x._id === id ? { ...x, isRead: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await API.put('/notifications/read-all');
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    setUnread(0);
    toast.success('All marked as read');
  };

  const deleteNotification = async (id) => {
    await API.delete(`/notifications/${id}`);
    setNotifications(n => n.filter(x => x._id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-gray-900">Notifications</h1>
          {unread > 0 && <span className="badge badge-red">{unread} unread</span>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-1">
            <HiOutlineCheck className="w-4 h-4" /> Mark All Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <HiOutlineBell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const typeInfo = typeIcons[n.type] || typeIcons.info;
            return (
              <div key={n._id} className={`card flex items-start gap-3 group transition-all ${!n.isRead ? 'border-l-4 border-primary-500 bg-primary-50/20' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.color}`}>
                  <span className="text-lg">{typeInfo.icon}</span>
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
                  {!n.isRead && <button onClick={() => markRead(n._id)} className="p-1.5 hover:bg-green-50 rounded-lg"><HiOutlineCheck className="w-4 h-4 text-green-500" /></button>}
                  <button onClick={() => deleteNotification(n._id)} className="p-1.5 hover:bg-red-50 rounded-lg"><HiOutlineTrash className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
