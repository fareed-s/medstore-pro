import { useCallback, useEffect, useMemo, useState } from 'react';
import API from '../../utils/api';
import { HiOutlineExclamation } from 'react-icons/hi';
import Spinner from '../../shared/components/Spinner';
import ExpiryTabs, { COLOR_DOT } from './components/ExpiryTabs';
import ExpiryRow from './components/ExpiryRow';

export default function ExpiryDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('within30');

  useEffect(() => {
    API.get('/batches/expiry-dashboard').then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  const tabs = useMemo(() => ([
    { key: 'expired',  label: 'Expired',     color: 'red',   count: data?.expired?.count  || 0, value: data?.expired?.value  || 0 },
    { key: 'within30', label: '0-30 Days',   color: 'red',   count: data?.within30?.count || 0, value: data?.within30?.value || 0 },
    { key: 'within60', label: '31-60 Days',  color: 'amber', count: data?.within60?.count || 0, value: data?.within60?.value || 0 },
    { key: 'within90', label: '61-90 Days',  color: 'green', count: data?.within90?.count || 0, value: data?.within90?.value || 0 },
  ]), [data]);

  const onSelectTab = useCallback((key) => setActiveTab(key), []);
  const activeItems = data?.[activeTab]?.items || [];
  const activeLabel = tabs.find((t) => t.key === activeTab)?.label || '';

  if (loading) return <Spinner size="lg" padding="lg" />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Expiry Dashboard</h1>
        <p className="text-gray-500 text-sm">Track medicines approaching expiry date</p>
      </div>

      <ExpiryTabs tabs={tabs} activeKey={activeTab} onSelect={onSelectTab} />

      <div className="card mb-6">
        <p className="text-sm font-medium text-gray-600 mb-3">Expiry Risk Distribution</p>
        <div className="flex rounded-full overflow-hidden h-4 bg-gray-100">
          {tabs.map((t) => {
            const total = tabs.reduce((s, x) => s + x.count, 0);
            const pct = total > 0 ? (t.count / total) * 100 : 0;
            return pct > 0 ? (
              <div key={t.key} className={`${COLOR_DOT[t.color]} transition-all`}
                style={{ width: `${pct}%` }} title={`${t.label}: ${t.count} (${pct.toFixed(1)}%)`} />
            ) : null;
          })}
        </div>
        <div className="flex gap-4 mt-2 flex-wrap">
          {tabs.map((t) => (
            <div key={t.key} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${COLOR_DOT[t.color]}`} />
              {t.label}: {t.count}
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-semibold text-gray-900">{activeLabel} — {activeItems.length} batches</h3>
        </div>
        {activeItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Remaining Qty</th>
                  <th className="px-4 py-3">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeItems.map((b) => <ExpiryRow key={b._id} batch={b} tab={activeTab} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <HiOutlineExclamation className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No batches in this range</p>
          </div>
        )}
      </div>
    </div>
  );
}
