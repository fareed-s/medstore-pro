import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { HiOutlineChartBar, HiOutlineCube, HiOutlineTruck, HiOutlineShieldCheck } from 'react-icons/hi';

const COLORS = ['#059669', '#10b981', '#34d399', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

export default function ReportsPage() {
  const [reportList, setReportList] = useState([]);
  const [activeReport, setActiveReport] = useState('sales-summary');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { API.get('/reports').then(r => setReportList(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { if (activeReport) fetchReport(); }, [activeReport]);

  const fetchReport = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    try {
      const { data: res } = await API.get(`/reports/${activeReport}?${params}`);
      setData(res);
    } catch { setData(null); } finally { setLoading(false); }
  };

  const groupIcons = { Sales: HiOutlineChartBar, Inventory: HiOutlineCube, Purchase: HiOutlineTruck, Regulatory: HiOutlineShieldCheck };

  const renderReport = () => {
    if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
    if (!data?.data || (Array.isArray(data.data) && data.data.length === 0)) return <p className="text-center py-16 text-gray-400">No data for selected period</p>;

    const items = Array.isArray(data.data) ? data.data : [];

    switch (activeReport) {
      case 'sales-summary':
        return (
          <div>
            {data.totals && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="card text-center py-3"><p className="text-xs text-gray-500">Total Sales</p><p className="text-xl font-heading font-bold">{data.totals.sales}</p></div>
                <div className="card text-center py-3"><p className="text-xs text-gray-500">Revenue</p><p className="text-xl font-heading font-bold text-primary-600">{formatCurrency(data.totals.revenue)}</p></div>
                <div className="card text-center py-3"><p className="text-xs text-gray-500">Tax</p><p className="text-xl font-heading font-bold">{formatCurrency(data.totals.tax)}</p></div>
                <div className="card text-center py-3"><p className="text-xs text-gray-500">Discounts</p><p className="text-xl font-heading font-bold text-red-500">{formatCurrency(data.totals.discount)}</p></div>
              </div>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={items.map(d => ({ date: d._id, revenue: d.revenue, sales: d.totalSales }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'sales-by-category':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={items.map(d => ({ name: d._id, value: d.totalRevenue }))} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="value">
                  {items.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <table className="w-full text-sm self-start">
              <thead><tr className="table-header"><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Revenue</th><th className="px-3 py-2 text-right">Qty</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((d, i) => (
                  <tr key={i}><td className="px-3 py-2 flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{d._id}</td><td className="px-3 py-2 text-right font-medium">{formatCurrency(d.totalRevenue)}</td><td className="px-3 py-2 text-right">{d.totalQty}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'hourly-sales':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={items.map(d => ({ hour: `${d._id}:00`, sales: d.totalSales, revenue: d.totalRevenue }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#059669" strokeWidth={2} name="Sales Count" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'sales-by-payment':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((d, i) => (
              <div key={i} className="card text-center py-4">
                <p className="text-xs text-gray-500 uppercase mb-1">{d._id}</p>
                <p className="text-2xl font-heading font-bold text-primary-600">{formatCurrency(d.totalAmount)}</p>
                <p className="text-xs text-gray-400">{d.count} transactions</p>
              </div>
            ))}
          </div>
        );

      default:
        // Generic table for all other reports
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                {Object.keys(items[0] || {}).filter(k => k !== '_id').map(k => (
                  <th key={k} className="px-3 py-2 text-left">{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    {Object.entries(row).filter(([k]) => k !== '_id').map(([k, v], j) => (
                      <td key={j} className="px-3 py-2">
                        {typeof v === 'object' && v !== null ? (v.name || v.id || JSON.stringify(v)) :
                         typeof v === 'number' && (k.includes('Revenue') || k.includes('Cost') || k.includes('total') || k.includes('profit') || k.includes('Spent') || k.includes('Discount') || k.includes('Value'))
                          ? formatCurrency(v) : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.totals && <div className="px-3 py-2 bg-gray-50 text-sm font-bold">Total: {formatCurrency(data.totals.revenue || data.totals.costValue || data.totalRefund || data.totalDiscount || 0)}</div>}
          </div>
        );
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Reports & Analytics</h1>
      <p className="text-gray-500 text-sm mb-6">40+ reports across sales, inventory, purchases, and compliance</p>

      <div className="flex gap-6">
        {/* Left sidebar - report list */}
        <div className="w-60 flex-shrink-0 hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {reportList.map(group => {
              const Icon = groupIcons[group.group] || HiOutlineChartBar;
              return (
                <div key={group.group}>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase mb-1.5 px-2">
                    <Icon className="w-4 h-4" /> {group.group}
                  </div>
                  {group.items.map(r => (
                    <button key={r.key} onClick={() => setActiveReport(r.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all mb-0.5 ${activeReport === r.key ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {r.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Mobile report selector */}
          <div className="lg:hidden mb-4">
            <select className="input-field" value={activeReport} onChange={(e) => setActiveReport(e.target.value)}>
              {reportList.map(g => g.items.map(r => <option key={r.key} value={r.key}>{g.group}: {r.name}</option>))}
            </select>
          </div>

          {/* Date filter */}
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div><label className="label">From</label><input type="date" className="input-field w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
            <div><label className="label">To</label><input type="date" className="input-field w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
            <button onClick={fetchReport} className="btn-primary text-sm">Generate</button>
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="btn-ghost text-sm">Reset</button>
          </div>

          {/* Report content */}
          <div className="card min-h-[400px]">
            <h3 className="font-heading font-semibold text-gray-900 mb-4">
              {reportList.flatMap(g => g.items).find(r => r.key === activeReport)?.name || activeReport}
            </h3>
            {renderReport()}
          </div>
        </div>
      </div>
    </div>
  );
}
