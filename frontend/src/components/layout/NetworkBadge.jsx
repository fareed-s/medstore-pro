// Network status pill in the header.
// - Online + queue empty   → no badge (clean header)
// - Online + queue > 0     → emerald "Syncing N…" badge, click syncs now
// - Offline                → amber "Offline · N pending" badge, click opens
//                            the pending-sync review page

import { useNavigate } from 'react-router-dom';
import {
  HiOutlineStatusOffline, HiOutlineCloud, HiOutlineRefresh,
} from 'react-icons/hi';
import { useOffline } from '../../offline/OfflineContext';

export default function NetworkBadge() {
  const { online, syncing, pendingCount, syncNow } = useOffline();
  const navigate = useNavigate();

  // Clean header when everything is happy. The icon adds noise otherwise.
  if (online && pendingCount === 0 && !syncing) return null;

  if (!online) {
    return (
      <button
        onClick={() => navigate('/settings/offline-sync')}
        title="Working offline — click to review pending sales"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
      >
        <HiOutlineStatusOffline className="w-4 h-4" />
        Offline
        {pendingCount > 0 && <span>· {pendingCount} pending</span>}
      </button>
    );
  }

  // Online with pending or actively syncing.
  return (
    <button
      onClick={syncNow}
      disabled={syncing}
      title={syncing ? 'Syncing…' : `Sync ${pendingCount} offline sale(s) now`}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-200 disabled:opacity-60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
    >
      {syncing
        ? <HiOutlineRefresh className="w-4 h-4 animate-spin" />
        : <HiOutlineCloud className="w-4 h-4" />}
      {syncing ? 'Syncing…' : `${pendingCount} pending`}
    </button>
  );
}
