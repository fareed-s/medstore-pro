// Expiry tracker for the hidden module — mirrors the main /inventory/expiry
// page but reads from /api/controlled/expiry-dashboard so it only sees the
// vault's medicines. Same 5-bucket layout (Expired / 0-30 / 31-60 / 61-90
// / 91-180) for muscle-memory parity.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiOutlineExclamation } from 'react-icons/hi';
import { controlledApi } from '../../context/ControlledModuleContext';
import { apiError, formatCurrency, formatDate } from '../../utils/helpers';

const TAB_DEFS = [
  { key: 'expired',   label: 'Expired',     palette: 'red' },
  { key: 'within30',  label: '0-30 Days',   palette: 'red' },
  { key: 'within60',  label: '31-60 Days',  palette: 'amber' },
  { key: 'within90',  label: '61-90 Days',  palette: 'green' },
  { key: 'within180', label: '91-180 Days', palette: 'blue' },
];

const PALETTE = {
  red:   { dot: 'bg-red-500',     activeBg: 'bg-red-500/10 border-red-500/40',     val: 'text-red-300',     date: 'text-red-400' },
  amber: { dot: 'bg-amber-500',   activeBg: 'bg-amber-500/10 border-amber-500/40', val: 'text-amber-300',   date: 'text-amber-400' },
  green: { dot: 'bg-emerald-500', activeBg: 'bg-emerald-500/10 border-emerald-500/40', val: 'text-emerald-300', date: 'text-emerald-400' },
  blue:  { dot: 'bg-blue-500',    activeBg: 'bg-blue-500/10 border-blue-500/40',   val: 'text-blue-300',    date: 'text-blue-400' },
};

export default function ControlledExpiryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState('within30');

  useEffect(() => {
    let cancelled = false;
    controlledApi.get('/expiry-dashboard')
      .then((r) => { if (!cancelled) setData(r.data.data); })
      .catch((err) => toast.error(apiError(err, 'Failed to load expiry data')))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const tabs = useMemo(() => TAB_DEFS.map((d) => ({
    ...d,
    count: data?.[d.key]?.count || 0,
    value: data?.[d.key]?.value || 0,
  })), [data]);

  const totalCount = tabs.reduce((s, t) => s + t.count, 0);
  const items = data?.[activeKey]?.items || [];
  const activeLabel = tabs.find((t) => t.key === activeKey)?.label || '';

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-heading font-bold text-white">Expiry Tracker</h1>
        <p className="text-sm text-gray-400">Track controlled batches approaching expiry</p>
      </div>

      {/* Tab tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {tabs.map((t) => {
          const p = PALETTE[t.palette];
          const active = activeKey === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveKey(t.key)}
              className={`text-left rounded-xl p-4 border transition-all ${
                active ? p.activeBg : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t.label}</span>
              </div>
              <p className={`text-2xl font-heading font-bold ${p.val}`}>{t.count}</p>
              <p className="text-xs text-gray-500 mt-1">Value: {formatCurrency(t.value)}</p>
            </button>
          );
        })}
      </div>

      {/* Risk distribution bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Expiry Risk Distribution</p>
        <div className="flex rounded-full overflow-hidden h-3 bg-gray-950">
          {tabs.map((t) => {
            const pct = totalCount > 0 ? (t.count / totalCount) * 100 : 0;
            return pct > 0 ? (
              <div key={t.key} className={PALETTE[t.palette].dot} style={{ width: `${pct}%` }} title={`${t.label}: ${t.count} (${pct.toFixed(1)}%)`} />
            ) : null;
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {tabs.map((t) => (
            <div key={t.key} className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className={`w-2 h-2 rounded-full ${PALETTE[t.palette].dot}`} />
              {t.label}: {t.count}
            </div>
          ))}
        </div>
      </div>

      {/* Active bucket table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="font-heading font-semibold text-white">{activeLabel} — {items.length} batch(es)</h3>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <HiOutlineExclamation className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No batches in this range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3 text-right">Remaining Qty</th>
                  <th className="px-4 py-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {items.map((b) => {
                  const dateCls = PALETTE[tabs.find((t) => t.key === activeKey)?.palette || 'red'].date;
                  return (
                    <tr key={b._id} className="hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <Link to={`/secure/medicines/${b.medicineId?._id}/edit`} className="text-gray-100 hover:text-red-300 font-medium">
                          {b.medicineId?.medicineName || 'Unknown'}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {b.medicineId?.schedule}{b.medicineId?.genericName ? ` · ${b.medicineId.genericName}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">{b.batchNumber}</td>
                      <td className="px-4 py-3"><span className={`font-medium ${dateCls}`}>{formatDate(b.expiryDate)}</span></td>
                      <td className="px-4 py-3 text-right text-gray-100 font-mono">{b.remainingQty}</td>
                      <td className="px-4 py-3 text-right text-gray-300 font-mono">
                        {formatCurrency(b.remainingQty * (b.salePrice || 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
