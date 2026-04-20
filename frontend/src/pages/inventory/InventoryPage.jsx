import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { HiOutlineCube, HiOutlineBan, HiOutlineExclamation, HiOutlineClock, HiOutlineArchive } from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function InventoryPage() {
  const [data, setData] = useState(null);
  const [catStock, setCatStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/inventory/overview'),
      API.get('/inventory/category-stock'),
    ]).then(([ovRes, catRes]) => {
      setData(ovRes.data.data);
      setCatStock(catRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const stats = [
    { label: 'Total Products', value: data?.totalActive || 0, icon: HiOutlineCube, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Out of Stock', value: data?.outOfStock || 0, icon: HiOutlineBan, color: 'text-red-600', bg: 'bg-red-50', link: '/medicines?stockStatus=out' },
    { label: 'Low Stock', value: data?.lowStock || 0, icon: HiOutlineExclamation, color: 'text-amber-600', bg: 'bg-amber-50', link: '/medicines?stockStatus=low' },
    { label: 'Expiring Soon', value: data?.expiringSoon || 0, icon: HiOutlineClock, color: 'text-orange-600', bg: 'bg-orange-50', link: '/inventory/expiry' },
    { label: 'Expired Batches', value: data?.expired || 0, icon: HiOutlineBan, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Active Batches', value: data?.totalBatches || 0, icon: HiOutlineArchive, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Inventory Overview</h1>
          <p className="text-gray-500 text-sm">Stock, expiry, and category breakdown</p>
        </div>
        <Link to="/inventory/expiry" className="btn-primary">Expiry Dashboard</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="stat-card" onClick={() => s.link && (window.location.href = s.link)} style={s.link ? { cursor: 'pointer' } : {}}>
            <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-heading font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stock Value */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-2">Total Stock Value (at Cost)</p>
          <p className="text-3xl font-heading font-bold text-gray-900">{formatCurrency(data?.stockValue?.costValue || 0)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-2">Total Stock Value (at Retail)</p>
          <p className="text-3xl font-heading font-bold text-primary-600">{formatCurrency(data?.stockValue?.retailValue || 0)}</p>
        </div>
      </div>

      {/* Category Stock Chart */}
      <div className="card">
        <h3 className="font-heading font-semibold text-gray-900 mb-4">Stock by Category</h3>
        {catStock.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={catStock.map(c => ({ name: c._id || 'Other', stock: c.totalStock, value: Math.round(c.totalValue), outOfStock: c.outOfStock }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val, name) => [name === 'value' ? formatCurrency(val) : val, name === 'value' ? 'Value' : name === 'outOfStock' ? 'Out of Stock' : 'Total Stock']} />
                <Bar dataKey="stock" fill="#059669" radius={[4, 4, 0, 0]} name="Stock" />
                <Bar dataKey="outOfStock" fill="#dc2626" radius={[4, 4, 0, 0]} name="Out of Stock" />
              </BarChart>
            </ResponsiveContainer>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead><tr className="table-header">
                  <th className="px-4 py-2">Category</th><th className="px-4 py-2">Products</th><th className="px-4 py-2">Total Stock</th><th className="px-4 py-2">Value</th><th className="px-4 py-2">Out of Stock</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {catStock.map(c => (
                    <tr key={c._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 font-medium">{c._id || 'Other'}</td>
                      <td className="px-4 py-2">{c.count}</td>
                      <td className="px-4 py-2 font-semibold">{c.totalStock.toLocaleString()}</td>
                      <td className="px-4 py-2 text-primary-600 font-medium">{formatCurrency(c.totalValue)}</td>
                      <td className="px-4 py-2">{c.outOfStock > 0 ? <span className="badge badge-red">{c.outOfStock}</span> : <span className="text-gray-400">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <p className="text-gray-400 text-center py-8">No data</p>}
      </div>
    </div>
  );
}
