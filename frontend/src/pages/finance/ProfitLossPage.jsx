import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';

export default function ProfitLossPage() {
  const [data, setData] = useState(null);
  const [taxData, setTaxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    try {
      const [plRes, taxRes] = await Promise.all([
        API.get(`/finance/profit-loss?${params}`),
        API.get(`/finance/tax-report?${params}`),
      ]);
      setData(plRes.data.data);
      setTaxData(taxRes.data.data);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const chartData = data ? [
    { name: 'Revenue', value: data.revenue },
    { name: 'COGS', value: data.cogs },
    { name: 'Gross Profit', value: data.grossProfit },
    { name: 'Expenses', value: data.operatingExpenses },
    { name: 'Net Profit', value: data.netProfit },
  ] : [];

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Profit & Loss</h1>
      <p className="text-gray-500 text-sm mb-6">Financial performance overview</p>

      {/* Date Filter */}
      <div className="flex gap-3 mb-6 items-end">
        <div><label className="label">From</label><input type="date" className="input-field w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input type="date" className="input-field w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
        <button onClick={fetchData} className="btn-primary text-sm">Apply</button>
      </div>

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card text-center py-4 border-2 border-primary-100">
              <p className="text-xs text-gray-500 mb-1">Revenue</p>
              <p className="text-2xl font-heading font-bold text-primary-700">{formatCurrency(data.revenue)}</p>
              <p className="text-xs text-gray-400">{data.salesCount} sales</p>
            </div>
            <div className="card text-center py-4">
              <p className="text-xs text-gray-500 mb-1">Gross Profit</p>
              <p className="text-2xl font-heading font-bold text-green-600">{formatCurrency(data.grossProfit)}</p>
              <p className="text-xs text-green-500">{data.grossMargin}% margin</p>
            </div>
            <div className="card text-center py-4">
              <p className="text-xs text-gray-500 mb-1">Operating Expenses</p>
              <p className="text-2xl font-heading font-bold text-red-600">{formatCurrency(data.operatingExpenses)}</p>
            </div>
            <div className={`card text-center py-4 border-2 ${data.netProfit >= 0 ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
              <p className="text-xs text-gray-500 mb-1">Net Profit</p>
              <p className={`text-2xl font-heading font-bold ${data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(data.netProfit)}</p>
              <p className={`text-xs ${data.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{data.netMargin}% margin</p>
            </div>
          </div>

          {/* Chart */}
          <div className="card mb-6">
            <h3 className="font-heading font-semibold text-gray-900 mb-4">P&L Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => {
                    const colors = ['#059669', '#ef4444', '#10b981', '#f59e0b', entry.value >= 0 ? '#16a34a' : '#dc2626'];
                    return <Cell key={i} fill={colors[i]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* P&L Statement */}
          <div className="card mb-6">
            <h3 className="font-heading font-semibold text-gray-900 mb-4">Income Statement</h3>
            <div className="space-y-2 text-sm max-w-lg">
              <div className="flex justify-between py-1"><span className="font-medium">Sales Revenue</span><span className="font-bold">{formatCurrency(data.revenue)}</span></div>
              <div className="flex justify-between py-1 text-gray-500 pl-4"><span>Less: Cost of Goods Sold (COGS)</span><span className="text-red-600">({formatCurrency(data.cogs)})</span></div>
              <div className="flex justify-between py-2 border-t border-b font-bold"><span>Gross Profit</span><span className="text-green-600">{formatCurrency(data.grossProfit)}</span></div>
              <div className="flex justify-between py-1 text-gray-500 pl-4"><span>Less: Operating Expenses</span><span className="text-red-600">({formatCurrency(data.operatingExpenses)})</span></div>
              <div className={`flex justify-between py-2 border-t-2 border-b-2 font-bold text-lg ${data.netProfit >= 0 ? '' : 'text-red-600'}`}>
                <span>Net Profit / (Loss)</span><span>{formatCurrency(data.netProfit)}</span>
              </div>
              <div className="flex justify-between py-1 text-gray-400 text-xs"><span>Sales Tax Collected</span><span>{formatCurrency(data.salesTax)}</span></div>
              <div className="flex justify-between py-1 text-gray-400 text-xs"><span>Total Discounts Given</span><span>{formatCurrency(data.salesDiscount)}</span></div>
            </div>
          </div>

          {/* Tax Report */}
          {taxData && taxData.taxByRate?.length > 0 && (
            <div className="card">
              <h3 className="font-heading font-semibold text-gray-900 mb-4">Tax / GST Summary</h3>
              <table className="w-full text-sm">
                <thead><tr className="table-header">
                  <th className="px-4 py-2">Tax Rate</th><th className="px-4 py-2 text-right">Taxable Amount</th><th className="px-4 py-2 text-right">Tax Amount</th><th className="px-4 py-2 text-right">Items</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {taxData.taxByRate.map((t, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-medium">{t._id || 0}%</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(t.taxableAmount)}</td>
                      <td className="px-4 py-2 text-right font-bold">{formatCurrency(t.taxAmount)}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{t.count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td className="px-4 py-2">TOTAL</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(taxData.totalTaxable)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(taxData.totalTax)}</td>
                    <td className="px-4 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
