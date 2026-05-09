// Aging report — receivables (customers) + payables (suppliers) bucketed
// by age. Helps the owner see "kis customer ka 60+ din se paisa fasa hai"
// and "kis supplier ko purana paisa dena hai" at a glance.
//
// Buckets: 0-30 / 31-60 / 61-90 / 90+ days. Anything in 90+ is
// highlighted red — that's overdue and needs collection action.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  HiOutlineArrowLeft, HiOutlineRefresh, HiOutlineDownload,
  HiOutlineUserGroup, HiOutlineTruck,
} from 'react-icons/hi';
import API from '../../utils/api';
import { apiError, formatCurrency } from '../../utils/helpers';

const BUCKETS = ['0-30', '31-60', '61-90', '90+'];
const BUCKET_CLS = {
  '0-30':  'text-emerald-700',
  '31-60': 'text-amber-700',
  '61-90': 'text-orange-700',
  '90+':   'text-red-700 font-bold',
};

export default function AgingReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('receivables');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await API.get('/reports/aging');
      setData(res.data);
    } catch (err) {
      toast.error(apiError(err, 'Failed to load aging report'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const exportCsv = () => {
    if (!data) return;
    const rows = tab === 'receivables' ? data.receivables : data.payables;
    const partyKey = tab === 'receivables' ? 'customerName' : 'supplierName';
    const countKey = tab === 'receivables' ? 'invoiceCount' : 'grnCount';
    const lines = [
      [tab === 'receivables' ? 'Customer' : 'Supplier', '0-30', '31-60', '61-90', '90+', 'Total', 'Oldest (days)', 'Documents'].join(','),
      ...rows.map((r) => [
        `"${(r[partyKey] || '').replace(/"/g, '""')}"`,
        r.buckets['0-30'].toFixed(2),
        r.buckets['31-60'].toFixed(2),
        r.buckets['61-90'].toFixed(2),
        r.buckets['90+'].toFixed(2),
        r.total.toFixed(2),
        r.oldestDays,
        r[countKey],
      ].join(',')),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aging-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  }
  if (!data) return null;

  const active = tab === 'receivables' ? data.receivables : data.payables;
  const totals = tab === 'receivables' ? data.totals.receivables : data.totals.payables;

  return (
    <div>
      <Link to="/reports" className="text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1 mb-3">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Reports
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Aging Report</h1>
          <p className="text-gray-500 text-sm">Outstanding balances by age · Collect what's overdue</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary text-sm flex items-center gap-1.5">
            <HiOutlineRefresh className="w-4 h-4"/> Refresh
          </button>
          <button onClick={exportCsv} disabled={active.length === 0} className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50">
            <HiOutlineDownload className="w-4 h-4"/> Export CSV
          </button>
        </div>
      </div>

      {/* Headline tiles — receivables vs payables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <SummaryCard
          icon={HiOutlineUserGroup}
          label="Receivables (customers owe us)"
          totals={data.totals.receivables}
          accent="emerald"
          partiesCount={data.receivables.length}
        />
        <SummaryCard
          icon={HiOutlineTruck}
          label="Payables (we owe suppliers)"
          totals={data.totals.payables}
          accent="red"
          partiesCount={data.payables.length}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit dark:bg-gray-800">
        <Tab onClick={() => setTab('receivables')} active={tab === 'receivables'}>
          Receivables ({data.receivables.length})
        </Tab>
        <Tab onClick={() => setTab('payables')} active={tab === 'payables'}>
          Payables ({data.payables.length})
        </Tab>
      </div>

      {/* Detail table */}
      <div className="card overflow-hidden p-0">
        {active.length === 0 ? (
          <p className="text-center py-12 text-gray-400">
            {tab === 'receivables' ? 'No outstanding receivables. 🎉' : 'No outstanding payables. 🎉'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">{tab === 'receivables' ? 'Customer' : 'Supplier'}</th>
                  <th className="px-4 py-3 text-right">0-30 days</th>
                  <th className="px-4 py-3 text-right">31-60 days</th>
                  <th className="px-4 py-3 text-right">61-90 days</th>
                  <th className="px-4 py-3 text-right">90+ days</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Oldest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {active.map((r) => (
                  <tr key={(r.customerId || r.supplierId || r.customerName)} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      {tab === 'receivables' ? (
                        r.customerId
                          ? <Link to={`/customers/${r.customerId}`} className="text-primary-700 hover:underline font-medium">{r.customerName}</Link>
                          : <span className="text-gray-700">{r.customerName}</span>
                      ) : (
                        <Link to={`/purchase/suppliers/${r.supplierId}`} className="text-primary-700 hover:underline font-medium">{r.supplierName}</Link>
                      )}
                      <p className="text-xs text-gray-400">
                        {tab === 'receivables' ? `${r.invoiceCount} invoice(s)` : `${r.grnCount} GRN(s)`}
                      </p>
                    </td>
                    {BUCKETS.map((b) => (
                      <td key={b} className="px-4 py-3 text-right font-mono">
                        {r.buckets[b] > 0
                          ? <span className={BUCKET_CLS[b]}>{formatCurrency(r.buckets[b])}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(r.total)}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{r.oldestDays}d</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td className="px-4 py-3">TOTAL</td>
                  {BUCKETS.map((b) => (
                    <td key={b} className="px-4 py-3 text-right font-mono">
                      <span className={BUCKET_CLS[b]}>{formatCurrency(totals.buckets[b])}</span>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Receivables: per-invoice balanceDue, aged from sale date.
        Payables: per-GRN cost, aged from receipt date with FIFO payment allocation
        (oldest GRN paid first since payments are not tied to specific GRNs).
      </p>
    </div>
  );
}

// ─── components ─────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, totals, accent, partiesCount }) {
  const accentCls = accent === 'red' ? 'text-red-600' : 'text-emerald-600';
  const overdue = totals.buckets['90+'];
  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent === 'red' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-3xl font-heading font-bold ${accentCls}`}>{formatCurrency(totals.total)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{partiesCount} {partiesCount === 1 ? 'party' : 'parties'}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 text-xs">
        {BUCKETS.map((b) => (
          <div key={b} className="text-center bg-gray-50 rounded p-1.5">
            <p className="text-[10px] text-gray-400 uppercase">{b}</p>
            <p className={`font-mono font-medium ${BUCKET_CLS[b]}`}>{formatCurrency(totals.buckets[b])}</p>
          </div>
        ))}
      </div>
      {overdue > 0 && (
        <p className="mt-2 text-[11px] text-red-600 font-medium">
          ⚠ {formatCurrency(overdue)} overdue (90+ days) — needs collection action
        </p>
      )}
    </div>
  );
}

function Tab({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-white shadow-sm text-primary-700 dark:bg-gray-700 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
