import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { HiOutlineExclamation } from 'react-icons/hi';

export default function ExpiryDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('within30');

  useEffect(() => {
    API.get('/batches/expiry-dashboard').then(res => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const tabs = [
    { key: 'expired', label: 'Expired', color: 'red', count: data?.expired?.count || 0, value: data?.expired?.value || 0 },
    { key: 'within30', label: '0-30 Days', color: 'red', count: data?.within30?.count || 0, value: data?.within30?.value || 0 },
    { key: 'within60', label: '31-60 Days', color: 'amber', count: data?.within60?.count || 0, value: data?.within60?.value || 0 },
    { key: 'within90', label: '61-90 Days', color: 'green', count: data?.within90?.count || 0, value: data?.within90?.value || 0 },
  ];

  const activeItems = data?.[activeTab]?.items || [];
  const colorMap = { red: 'bg-red-500', amber: 'bg-amber-500', green: 'bg-emerald-500' };
  const colorMapLight = { red: 'bg-red-50 border-red-200', amber: 'bg-amber-50 border-amber-200', green: 'bg-emerald-50 border-emerald-200' };
  const textColor = { red: 'text-red-700', amber: 'text-amber-700', green: 'text-emerald-700' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Expiry Dashboard</h1>
        <p className="text-gray-500 text-sm">Track medicines approaching expiry date</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`card text-left transition-all duration-200 border-2 ${activeTab === tab.key ? colorMapLight[tab.color] : 'border-transparent hover:border-gray-200'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${colorMap[tab.color]}`} />
              <span className="text-xs font-semibold text-gray-500 uppercase">{tab.label}</span>
            </div>
            <p className={`text-2xl font-heading font-bold ${textColor[tab.color]}`}>{tab.count}</p>
            <p className="text-xs text-gray-400 mt-1">Value: {formatCurrency(tab.value)}</p>
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="card mb-6">
        <p className="text-sm font-medium text-gray-600 mb-3">Expiry Risk Distribution</p>
        <div className="flex rounded-full overflow-hidden h-4 bg-gray-100">
          {tabs.map(tab => {
            const total = tabs.reduce((s, t) => s + t.count, 0);
            const pct = total > 0 ? (tab.count / total * 100) : 0;
            return pct > 0 ? (
              <div key={tab.key} className={`${colorMap[tab.color]} transition-all`} style={{ width: `${pct}%` }} title={`${tab.label}: ${tab.count} (${pct.toFixed(1)}%)`} />
            ) : null;
          })}
        </div>
        <div className="flex gap-4 mt-2">
          {tabs.map(tab => (
            <div key={tab.key} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${colorMap[tab.color]}`} />
              {tab.label}: {tab.count}
            </div>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-semibold text-gray-900">
            {tabs.find(t => t.key === activeTab)?.label} — {activeItems.length} batches
          </h3>
        </div>
        {activeItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-3">Medicine</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Remaining Qty</th>
                <th className="px-4 py-3">Value</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {activeItems.map(b => (
                  <tr key={b._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link to={`/medicines/${b.medicineId?._id}`} className="font-medium text-gray-900 hover:text-primary-600">
                        {b.medicineId?.medicineName || 'Unknown'}
                      </Link>
                      <p className="text-xs text-gray-400">{b.medicineId?.genericName}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{b.batchNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${activeTab === 'expired' || activeTab === 'within30' ? 'text-red-600' : activeTab === 'within60' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatDate(b.expiryDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{b.remainingQty}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(b.remainingQty * (b.medicineId?.salePrice || 0))}</td>
                  </tr>
                ))}
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
