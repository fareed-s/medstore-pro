// Read-only audit-trail viewer for users INSIDE the vault. Same data the
// SuperAdmin sees in the per-store module modal — useful for StoreAdmins
// to self-audit who unlocked, what they accessed, and when.

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { HiOutlineShieldCheck, HiOutlineRefresh } from 'react-icons/hi';
import { controlledApi } from '../../context/ControlledModuleContext';
import { apiError, formatDateTime } from '../../utils/helpers';

const EVENT_BADGES = {
  unlock_success:  { label: 'Unlock OK',     cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  unlock_failed:   { label: 'Unlock Fail',   cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  unlock_blocked:  { label: 'Blocked',       cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  lock:            { label: 'Lock',          cls: 'bg-gray-700/40 text-gray-300 border-gray-700' },
  access:          { label: 'Access',        cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  access_denied:   { label: 'Access Denied', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  password_set:    { label: 'Password Set',  cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  enabled:         { label: 'Enabled',       cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  disabled:        { label: 'Disabled',      cls: 'bg-gray-700/40 text-gray-300 border-gray-700' },
  inspection_on:   { label: 'Inspection ON', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  inspection_off:  { label: 'Inspection OFF',cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  user_allowed:    { label: 'User +',        cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  user_revoked:    { label: 'User −',        cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

export default function ControlledAccessLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '200');
    if (filter) params.set('event', filter);
    controlledApi.get(`/logs?${params}`)
      .then((r) => setLogs(r.data.data))
      .catch((err) => toast.error(apiError(err, 'Failed to load logs')))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
            <HiOutlineShieldCheck className="w-6 h-6 text-red-400" />
            Access Logs
          </h1>
          <p className="text-sm text-gray-400">Immutable audit trail · {logs.length} most recent entries</p>
        </div>
        <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 text-sm flex items-center gap-1.5">
          <HiOutlineRefresh className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md bg-gray-950 border border-gray-800 text-gray-100 text-sm w-full sm:max-w-xs"
        >
          <option value="">All events</option>
          {Object.keys(EVENT_BADGES).map((k) => (
            <option key={k} value={k}>{EVENT_BADGES[k].label}</option>
          ))}
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-500">No log entries.</p>
        ) : (
          <div className="divide-y divide-gray-800/60 text-sm">
            {logs.map((l) => {
              const badge = EVENT_BADGES[l.event] || { label: l.event, cls: 'bg-gray-700/40 text-gray-300 border-gray-700' };
              return (
                <div key={l._id} className="p-3 flex items-start gap-3">
                  <span className={`badge border flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-100 truncate">{l.userName || l.userEmail || '—'}</p>
                    {l.reason && <p className="text-xs text-gray-400">{l.reason}</p>}
                    {l.route && <p className="text-[11px] font-mono text-gray-500 truncate mt-0.5">{l.route}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 text-[11px] text-gray-500">
                    {formatDateTime(l.createdAt)}
                    {l.ipAddress && <p className="font-mono">{l.ipAddress}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
