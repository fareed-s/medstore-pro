import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { HiOutlineShoppingCart, HiOutlineExclamation } from 'react-icons/hi';

export default function ReorderPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/inventory-v2/reorder-suggestions').then(res => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const urgencyBadge = { critical: 'badge-red', high: 'badge-amber', medium: 'badge-blue' };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Reorder Suggestions</h1>
      <p className="text-gray-500 text-sm mb-6">Products at or below reorder level</p>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center"><HiOutlineShoppingCart className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xs text-gray-500">Need Reorder</p><p className="text-xl font-heading font-bold">{data.summary.count}</p></div>
          </div>
          <div className="stat-card">
            <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center"><HiOutlineExclamation className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-xs text-gray-500">Critical (0 stock)</p><p className="text-xl font-heading font-bold text-red-600">{data.summary.critical}</p></div>
          </div>
          <div className="stat-card">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center"><HiOutlineExclamation className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xs text-gray-500">High Priority</p><p className="text-xl font-heading font-bold text-amber-600">{data.summary.high}</p></div>
          </div>
          <div className="card text-center py-3">
            <p className="text-xs text-gray-500">Est. Reorder Cost</p>
            <p className="text-xl font-heading font-bold text-primary-600">{formatCurrency(data.summary.totalEstimatedCost)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {data?.items?.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="font-medium">All stock levels are healthy!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-3">Medicine</th><th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Current</th><th className="px-4 py-3 text-center">Reorder Level</th>
                <th className="px-4 py-3 text-center">Suggested Qty</th><th className="px-4 py-3 text-right">Est. Cost</th>
                <th className="px-4 py-3">Urgency</th><th className="px-4 py-3 hidden lg:table-cell">Rack</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {data?.items?.map(item => (
                  <tr key={item._id} className={`hover:bg-gray-50/50 ${item.urgency === 'critical' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-xs">{item.medicineName}</p>
                      <p className="text-[10px] text-gray-400">{item.genericName} • {item.manufacturer}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${item.currentStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>{item.currentStock}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.reorderLevel}</td>
                    <td className="px-4 py-3 text-center font-semibold text-primary-600">{item.suggestedQty}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.estimatedCost)}</td>
                    <td className="px-4 py-3"><span className={`badge ${urgencyBadge[item.urgency]}`}>{item.urgency}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{item.rackLocation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
