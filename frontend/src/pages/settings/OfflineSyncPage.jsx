// Review screen for sales that were created offline.
//
// Lifecycle of a row in the queue:
//   pending  → server hasn't seen it yet. Will go out on next sync.
//   syncing  → POST is in flight (transient — page refreshes will only
//              briefly catch this state).
//   synced   → server accepted it. Kept around for a short audit trail
//              with the real invoice number; user can clear them anytime.
//   failed   → POST returned an error. Operator must decide: retry (after
//              fixing whatever caused it) or abandon (delete locally).
//
// Single-cashier-offline rule means failed rows are usually data issues
// (out-of-stock at server, duplicate, etc.) — admin reviews and decides.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  HiOutlineRefresh, HiOutlineTrash, HiOutlineCheck, HiOutlineExclamation,
  HiOutlineCloud, HiOutlineStatusOffline, HiOutlineClock,
} from 'react-icons/hi';
import { useOffline } from '../../offline/OfflineContext';
import { useAuth } from '../../context/AuthContext';
import { listPendingSales } from '../../offline/db';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { confirmDanger } from '../../utils/swal';

const STATUS_BADGE = {
  pending: { label: 'Pending',  cls: 'bg-amber-100 text-amber-800 border-amber-200',     icon: HiOutlineClock },
  syncing: { label: 'Syncing…', cls: 'bg-blue-100 text-blue-800 border-blue-200',         icon: HiOutlineRefresh },
  synced:  { label: 'Synced',   cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: HiOutlineCheck },
  failed:  { label: 'Failed',   cls: 'bg-red-100 text-red-800 border-red-200',             icon: HiOutlineExclamation },
};

export default function OfflineSyncPage() {
  const { user } = useAuth();
  const { online, syncing, syncNow, removePending, refreshPendingCount } = useOffline();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user?.storeId) return;
    setLoading(true);
    try {
      setRows(await listPendingSales(user.storeId));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [user?.storeId]);
  // Re-fetch after a sync run.
  useEffect(() => { if (!syncing) fetchData(); /* eslint-disable-next-line */ }, [syncing]);

  const remove = async (row) => {
    const label = row.status === 'synced' ? 'Clear this synced row from local history?' : 'Abandon this offline sale?';
    if (!(await confirmDanger(
      row.status === 'synced'
        ? 'It already exists on the server — this only removes the local copy.'
        : 'It will NOT be sent to the server. The customer will not appear in any sales report.',
      { title: label, confirmText: row.status === 'synced' ? 'Clear' : 'Abandon' }
    ))) return;
    await removePending(row.tempId);
    await refreshPendingCount();
    fetchData();
    toast.success(row.status === 'synced' ? 'Cleared' : 'Abandoned');
  };

  const counts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Offline Sync</h1>
          <p className="text-gray-500 text-sm">Sales created while offline · {rows.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            online
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-amber-100 text-amber-800 border-amber-200'
          }`}>
            {online ? <HiOutlineCloud className="w-4 h-4"/> : <HiOutlineStatusOffline className="w-4 h-4"/>}
            {online ? 'Online' : 'Offline'}
          </span>
          <button
            onClick={syncNow}
            disabled={!online || syncing || (counts.pending || 0) + (counts.failed || 0) === 0}
            className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <HiOutlineRefresh className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Pending" value={counts.pending || 0} accent="amber" />
        <Stat label="Synced"  value={counts.synced  || 0} accent="green" />
        <Stat label="Failed"  value={counts.failed  || 0} accent="red" />
        <Stat label="Total"   value={rows.length} />
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <HiOutlineCloud className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nothing in the offline queue.</p>
            <p className="text-xs mt-1">Sales completed while offline will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r) => (
                  <Row key={r.tempId} row={r} onRemove={() => remove(r)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Failed rows usually mean the server rejected the sale (e.g. stock has changed since you went offline).
        Retry them after Sync Now once the underlying issue is fixed, or abandon if no longer needed.
      </p>
    </div>
  );
}

function Row({ row, onRemove }) {
  const badge = STATUS_BADGE[row.status] || STATUS_BADGE.pending;
  const Icon = badge.icon;
  const items = row.payload?.items || [];
  const total = items.reduce((s, i) => s + (i.unitPrice * i.quantity - (i.discount || 0)), 0);

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-3 font-mono text-xs text-gray-700">
        {row.serverInvoiceNo || row.tempId}
        {row.serverInvoiceNo && (
          <p className="text-[10px] text-gray-400">offline ref: {row.tempId}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="text-gray-700">{row.payload?.customerName || '—'}</p>
        {row.payload?.customerPhone && (
          <p className="text-[11px] text-gray-400">{row.payload.customerPhone}</p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {items.length} item(s)
        <p className="truncate max-w-[200px]">
          {items.slice(0, 2).map((i) => i.medicineName).join(', ')}
          {items.length > 2 && ` +${items.length - 2}`}
        </p>
      </td>
      <td className="px-4 py-3 text-right font-mono text-gray-700">{formatCurrency(total)}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(row.createdAt)}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}>
          <Icon className="w-3 h-3" />
          {badge.label}
        </span>
        {row.status === 'failed' && row.error && (
          <p className="text-[10px] text-red-500 mt-0.5 max-w-[200px]">{row.error}</p>
        )}
        {row.attempts > 0 && row.status !== 'synced' && (
          <p className="text-[10px] text-gray-400 mt-0.5">{row.attempts} attempt(s)</p>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onRemove}
          title={row.status === 'synced' ? 'Clear from local history' : 'Abandon (will NOT sync)'}
          className="p-1.5 rounded hover:bg-red-50 text-red-500"
        >
          <HiOutlineTrash className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function Stat({ label, value, accent }) {
  const cls = accent === 'red'   ? 'text-red-600'
            : accent === 'amber' ? 'text-amber-600'
            : accent === 'green' ? 'text-emerald-600'
            : 'text-gray-900';
  return (
    <div className="card text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold font-mono ${cls}`}>{value}</p>
    </div>
  );
}
