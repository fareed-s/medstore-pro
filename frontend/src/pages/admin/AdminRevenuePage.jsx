import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineOfficeBuilding, HiOutlineCreditCard } from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminRevenuePage() {
  const [stats, setStats] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.get('/superadmin/stats'), API.get('/superadmin/stores?limit=100')])
      .then(([statsRes, storesRes]) => { setStats(statsRes.data.data); setStores(storesRes.data.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  // Calculate revenue from plan pricing
  const planPrices = { 'Free Trial': 0, Starter: 2999, Professional: 5999, Premium: 9999, Enterprise: 19999 };
  const monthlyRevenue = stores.reduce((s, store) => s + (planPrices[store.plan] || 0), 0);
  const annualRevenue = monthlyRevenue * 12;

  const planDist = {};
  stores.forEach(s => { planDist[s.plan] = (planDist[s.plan] || 0) + 1; });
  const chartData = Object.entries(planDist).map(([name, count]) => ({ name, stores: count, revenue: count * (planPrices[name] || 0) }));

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Platform Revenue</h1>
      <p className="text-gray-500 text-sm mb-6">SaaS revenue overview</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card"><div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center"><HiOutlineTrendingUp className="w-5 h-5 text-green-600" /></div><div><p className="text-xs text-gray-500">Monthly Revenue</p><p className="text-xl font-heading font-bold text-green-600">{formatCurrency(monthlyRevenue)}</p></div></div>
        <div className="stat-card"><div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center"><HiOutlineChartBar className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-gray-500">Annual Revenue</p><p className="text-xl font-heading font-bold text-blue-600">{formatCurrency(annualRevenue)}</p></div></div>
        <div className="stat-card"><div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center"><HiOutlineOfficeBuilding className="w-5 h-5 text-primary-600" /></div><div><p className="text-xs text-gray-500">Paying Stores</p><p className="text-xl font-heading font-bold">{stores.filter(s => s.plan !== 'Free Trial').length}</p></div></div>
        <div className="stat-card"><div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center"><HiOutlineCreditCard className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-gray-500">Avg Revenue/Store</p><p className="text-xl font-heading font-bold">{stores.length > 0 ? formatCurrency(monthlyRevenue / stores.length) : '—'}</p></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-heading font-semibold text-gray-900 mb-4">Revenue by Plan</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#059669" radius={[6, 6, 0, 0]} name="Monthly Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-heading font-semibold text-gray-900 mb-4">Store Distribution</h3>
          <div className="space-y-3">
            {chartData.map(d => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-sm font-medium w-28">{d.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="bg-primary-500 h-full rounded-full transition-all" style={{ width: `${(d.stores / Math.max(...chartData.map(c => c.stores))) * 100}%` }} />
                </div>
                <span className="text-sm font-bold w-8 text-right">{d.stores}</span>
                <span className="text-xs text-gray-400 w-20 text-right">{formatCurrency(d.revenue)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
