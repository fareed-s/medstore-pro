import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { HiOutlineCube, HiOutlineExclamation, HiOutlineClock, HiOutlineUsers, HiOutlineBan, HiOutlineTag, HiOutlineArchive, HiOutlineChartBar } from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#2563eb', '#f59e0b'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data: res } = await API.get('/dashboard/stats');
      setData(res.data);
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const stats = data?.stats || {};
  const stockValue = data?.stockValue || {};

  const statCards = [
    { label: 'Total Products', value: stats.totalMedicines || 0, icon: HiOutlineCube, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Out of Stock', value: stats.outOfStock || 0, icon: HiOutlineBan, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Low Stock', value: stats.lowStock || 0, icon: HiOutlineExclamation, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Expiring (30d)', value: stats.expiring30 || 0, icon: HiOutlineClock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Expired', value: stats.expired || 0, icon: HiOutlineBan, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Categories', value: stats.categories || 0, icon: HiOutlineTag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Stock Value (Retail)', value: formatCurrency(stockValue.retailValue), icon: HiOutlineChartBar, color: 'text-emerald-600', bg: 'bg-emerald-50', isText: true },
    { label: 'Staff Members', value: stats.totalStaff || 0, icon: HiOutlineUsers, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome to your pharmacy management hub</p>
        </div>
        <Link to="/medicines/new" className="btn-primary hidden sm:inline-flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Add Medicine
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`font-heading font-bold ${s.isText ? 'text-lg' : 'text-xl'} text-gray-900`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Distribution */}
        <div className="card">
          <h3 className="font-heading font-semibold text-gray-900 mb-4">Products by Category</h3>
          {data?.topCategories?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.topCategories.map(c => ({ name: c._id || 'Other', count: c.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No data yet</p>}
        </div>

        {/* Stock Value Pie */}
        <div className="card">
          <h3 className="font-heading font-semibold text-gray-900 mb-4">Stock Value Breakdown</h3>
          {data?.topCategories?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.topCategories.filter(c => c.totalStock > 0).map(c => ({ name: c._id || 'Other', value: c.totalStock }))}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                >
                  {data.topCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `${value} units`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-12">No data yet</p>}
        </div>
      </div>

      {/* Low stock items */}
      {data?.lowStockItems?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-gray-900">Low Stock Alerts</h3>
            <Link to="/medicines?stockStatus=low" className="text-sm text-primary-600 hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Threshold</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.lowStockItems.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link to={`/medicines/${item._id}`} className="font-medium text-gray-900 hover:text-primary-600">{item.medicineName}</Link>
                      {item.genericName && <p className="text-xs text-gray-400">{item.genericName}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.category}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{item.currentStock}</td>
                    <td className="px-4 py-3 text-gray-500">{item.lowStockThreshold}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${item.currentStock === 0 ? 'badge-red' : 'badge-amber'}`}>
                        {item.currentStock === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
