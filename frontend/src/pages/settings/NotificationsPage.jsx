import { useCallback, useEffect, useState } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { HiOutlineBell, HiOutlineCheck } from 'react-icons/hi';
import Spinner from '../../shared/components/Spinner';
import NotificationItem from './components/NotificationItem';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get('/notifications');
        setNotifications(data.data);
        setUnread(data.unread);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  const markRead = useCallback(async (id) => {
    await API.put(`/notifications/${id}/read`);
    setNotifications((n) => n.map((x) => (x._id === id ? { ...x, isRead: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await API.put('/notifications/read-all');
    setNotifications((n) => n.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    toast.success('All marked as read');
  }, []);

  const deleteNotification = useCallback(async (id) => {
    await API.delete(`/notifications/${id}`);
    setNotifications((n) => n.filter((x) => x._id !== id));
  }, []);

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

      {loading ? <Spinner />
        : notifications.length === 0
          ? (
            <div className="card text-center py-16 text-gray-400">
              <HiOutlineBell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No notifications</p>
            </div>
          )
          : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <NotificationItem key={n._id} notification={n} onMarkRead={markRead} onDelete={deleteNotification} />
              ))}
            </div>
          )}
    </div>
  );
}
