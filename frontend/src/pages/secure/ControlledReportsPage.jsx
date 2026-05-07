// Three reports under one tabbed page:
//   • Sales — summary, per-schedule, per-day trend, top medicines
//   • Stock — every active medicine with batches, low/expiring/expired flags
//   • Register — flat chronological log (Form 4 style) with patient + doctor
//
// Each tab fetches its own endpoint, so switching tabs doesn't refetch the
// others. The Register tab supports CSV download for offline auditor review.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  HiOutlineChartBar, HiOutlineCube, HiOutlineDocumentText,
  HiOutlineDownload, HiOutlineRefresh,
} from 'react-icons/hi';
import { controlledApi } from '../../context/ControlledModuleContext';
import { apiError, formatCurrency, formatDate, formatDateTime } from '../../utils/helpers';

const TABS = [
  { key: 'sales',    label: 'Sales',    icon: HiOutlineChartBar },
  { key: 'stock',    label: 'Stock',    icon: HiOutlineCube },
  { key: 'register', label: 'Register', icon: HiOutlineDocumentText },
];

const SCHEDULE_BADGE = {
  'Schedule-H':  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Schedule-H1': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Schedule-X':  'bg-red-500/15 text-red-300 border-red-500/30',
};

// Default range: last 30 days. Ranges are pushed into queries as ISO dates.
const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

export default function ControlledReportsPage() {
  const [tab, setTab] = useState('sales');
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-1">Reports</h1>
      <p className="text-sm text-gray-400 mb-4">Sales · Stock · Register · all scoped to the controlled vault</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-1.5 ${
              tab === t.key
                ? 'border-red-500 text-red-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Date range — applies to Sales & Register; Stock ignores it */}
      {tab !== 'stock' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md bg-gray-950 border border-gray-800 text-gray-100 text-sm" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md bg-gray-950 border border-gray-800 text-gray-100 text-sm" />
          </div>
          <div className="col-span-2 sm:col-span-2 flex items-end gap-1">
            <QuickRange label="Today" onClick={() => { setFrom(today); setTo(today); }} />
            <QuickRange label="7d" onClick={() => { setFrom(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)); setTo(today); }} />
            <QuickRange label="30d" onClick={() => { setFrom(thirtyDaysAgo); setTo(today); }} />
            <QuickRange label="MTD" onClick={() => { const d = new Date(); d.setDate(1); setFrom(d.toISOString().slice(0, 10)); setTo(today); }} />
          </div>
        </div>
      )}

      {tab === 'sales' && <SalesTab from={from} to={to} />}
      {tab === 'stock' && <StockTab />}
      {tab === 'register' && <RegisterTab from={from} to={to} />}
    </div>
  );
}

function QuickRange({ label, onClick }) {
  return (
    <button onClick={onClick} className="px-2.5 py-1.5 rounded-md bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 text-xs">
      {label}
    </button>
  );
}

// ─── Sales tab ─────────────────────────────────────────────────────────────
function SalesTab({ from, to }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    controlledApi.get(`/reports/sales-summary?from=${from}&to=${to}`)
      .then((r) => { if (!cancelled) setData(r.data.data); })
      .catch((err) => toast.error(apiError(err, 'Failed to load report')))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [from, to]);

  if (loading) return <Spinner />;
  if (!data) return null;

  const t = data.totals;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Sales" value={t.salesCount} />
        <Stat label="Revenue" value={formatCurrency(t.revenue)} />
        <Stat label="Units" value={t.units} />
      </div>

      <Card title="By Schedule">
        {data.perSchedule.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <th className="py-2">Schedule</th>
                <th className="py-2 text-right">Sales</th>
                <th className="py-2 text-right">Units</th>
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {data.perSchedule.map((r) => (
                <tr key={r._id}>
                  <td className="py-2"><span className={`badge border ${SCHEDULE_BADGE[r._id] || 'bg-gray-800 text-gray-300 border-gray-700'}`}>{r._id}</span></td>
                  <td className="py-2 text-right text-gray-100 font-mono">{r.salesCount}</td>
                  <td className="py-2 text-right text-gray-100 font-mono">{r.units}</td>
                  <td className="py-2 text-right text-gray-100 font-mono">{formatCurrency(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Top Medicines (by revenue)">
        {data.topMedicines.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <th className="py-2">Medicine</th>
                <th className="py-2">Schedule</th>
                <th className="py-2 text-right">Units</th>
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {data.topMedicines.map((r) => (
                <tr key={r._id}>
                  <td className="py-2 text-gray-100">{r.medicineName}</td>
                  <td className="py-2"><span className={`badge text-[10px] border ${SCHEDULE_BADGE[r.schedule] || ''}`}>{r.schedule}</span></td>
                  <td className="py-2 text-right text-gray-100 font-mono">{r.units}</td>
                  <td className="py-2 text-right text-gray-100 font-mono">{formatCurrency(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Daily Trend">
        {data.perDay.length === 0 ? <Empty /> : <DailyBars rows={data.perDay} />}
      </Card>
    </div>
  );
}

// Bar chart with raw divs — no chart lib, keeps the bundle small.
function DailyBars({ rows }) {
  const max = Math.max(...rows.map((r) => r.revenue || 0), 1);
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r._id} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-gray-400 font-mono">{r._id}</span>
          <div className="flex-1 h-5 bg-gray-950 rounded overflow-hidden">
            <div className="h-full bg-red-600/70" style={{ width: `${(r.revenue / max) * 100}%` }} />
          </div>
          <span className="w-24 text-right text-gray-200 font-mono">{formatCurrency(r.revenue)}</span>
          <span className="w-10 text-right text-gray-500 font-mono">{r.salesCount}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Stock tab ─────────────────────────────────────────────────────────────
function StockTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduleFilter, setScheduleFilter] = useState('');

  const fetchData = () => {
    setLoading(true);
    controlledApi.get('/reports/stock')
      .then((r) => setData(r.data.data))
      .catch((err) => toast.error(apiError(err, 'Failed to load')))
      .finally(() => setLoading(false));
  };
  useEffect(fetchData, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.rows.filter((r) => !scheduleFilter || r.schedule === scheduleFilter);
  }, [data, scheduleFilter]);

  if (loading || !data) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Medicines" value={data.summary.medicines} />
        <Stat label="Total Units" value={data.summary.totalUnits} />
        <Stat label="Low Stock" value={data.summary.lowCount} accent={data.summary.lowCount ? 'amber' : null} />
        <Stat label="Expiring/Expired" value={data.summary.expiringCount + data.summary.expiredCount} accent={data.summary.expiredCount ? 'red' : null} />
      </div>

      <div className="flex items-center gap-2">
        <select value={scheduleFilter} onChange={(e) => setScheduleFilter(e.target.value)} className="px-3 py-1.5 rounded-md bg-gray-950 border border-gray-800 text-gray-100 text-sm">
          <option value="">All schedules</option>
          <option>Schedule-H</option>
          <option>Schedule-H1</option>
          <option>Schedule-X</option>
        </select>
        <button onClick={fetchData} className="px-2.5 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-gray-200 text-xs flex items-center gap-1">
          <HiOutlineRefresh className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <Card>
        {filtered.length === 0 ? <Empty /> : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.map((m) => (
              <div key={m._id} className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-100 font-medium">{m.medicineName}</p>
                    <p className="text-xs text-gray-500">{m.genericName || '—'}</p>
                  </div>
                  <span className={`badge border ${SCHEDULE_BADGE[m.schedule]}`}>{m.schedule}</span>
                  <p className={`font-mono font-semibold ${m.isLow ? 'text-amber-400' : 'text-gray-100'}`}>
                    {m.currentStock}
                  </p>
                </div>
                {m.batches.length > 0 ? (
                  <table className="w-full text-xs">
                    <tbody>
                      {m.batches.map((b) => (
                        <tr key={b._id} className="border-t border-gray-800/60">
                          <td className="py-1 font-mono text-gray-400">{b.batchNumber}</td>
                          <td className="py-1 text-right text-gray-300">{b.quantity}</td>
                          <td className={`py-1 text-right ${b.isExpired ? 'text-red-400' : b.expiringSoon ? 'text-amber-400' : 'text-gray-400'}`}>
                            {formatDate(b.expiryDate)}
                            {b.isExpired ? ' · expired' : b.expiringSoon ? ` · ${b.daysToExpiry}d` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-gray-500">No batches.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Register tab ──────────────────────────────────────────────────────────
function RegisterTab({ from, to }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    controlledApi.get(`/reports/register?from=${from}&to=${to}`)
      .then((r) => { if (!cancelled) setRows(r.data.data); })
      .catch((err) => toast.error(apiError(err, 'Failed to load register')))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [from, to]);

  const downloadCsv = () => {
    if (rows.length === 0) return;
    const headers = [
      'Date', 'Invoice', 'Voided', 'Medicine', 'Schedule', 'Batch', 'Expiry',
      'Qty', 'Unit Price', 'Total',
      'Patient', 'Patient Phone', 'Patient CNIC',
      'Doctor', 'Doctor Reg', 'Cashier',
    ];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push([
        formatDateTime(r.date),
        r.invoiceNo, r.isVoided ? 'YES' : '',
        r.medicineName, r.schedule, r.batchNumber, r.expiryDate ? formatDate(r.expiryDate) : '',
        r.quantity, r.unitPrice, r.total,
        r.patientName, r.patientPhone, r.patientCnic,
        r.doctorName, r.doctorReg, r.soldByName,
      ].map(escape).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `controlled-register-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{rows.length} entries</p>
        {rows.length > 0 && (
          <button onClick={downloadCsv} className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-medium flex items-center gap-1.5">
            <HiOutlineDownload className="w-4 h-4" /> Download CSV
          </button>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        {rows.length === 0 ? <Empty /> : (
          <table className="w-full text-xs min-w-[1000px]">
            <thead>
              <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Medicine</th>
                <th className="px-3 py-2">Sch.</th>
                <th className="px-3 py-2">Batch</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Doctor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {rows.map((r, i) => (
                <tr key={i} className={r.isVoided ? 'opacity-50' : ''}>
                  <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{formatDateTime(r.date)}</td>
                  <td className="px-3 py-1.5 font-mono text-gray-300">
                    {r.invoiceNo}
                    {r.isVoided && <span className="ml-1 text-[9px] text-red-400">VOID</span>}
                  </td>
                  <td className="px-3 py-1.5 text-gray-100">{r.medicineName}</td>
                  <td className="px-3 py-1.5"><span className={`badge text-[9px] border ${SCHEDULE_BADGE[r.schedule] || ''}`}>{r.schedule}</span></td>
                  <td className="px-3 py-1.5 font-mono text-gray-400">{r.batchNumber}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-gray-100">{r.quantity}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-gray-100">{formatCurrency(r.total)}</td>
                  <td className="px-3 py-1.5 text-gray-300">{r.patientName || '—'}</td>
                  <td className="px-3 py-1.5 text-gray-300">{r.doctorName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── primitives ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin" />
    </div>
  );
}

function Empty() {
  return <p className="text-center text-sm text-gray-500 py-6">No data for this range.</p>;
}

function Card({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      {title && <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-3">{title}</p>}
      {children}
    </div>
  );
}

function Stat({ label, value, accent }) {
  const cls = accent === 'red'   ? 'text-red-400'
            : accent === 'amber' ? 'text-amber-400'
            : 'text-white';
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold font-mono ${cls}`}>{value}</p>
    </div>
  );
}
