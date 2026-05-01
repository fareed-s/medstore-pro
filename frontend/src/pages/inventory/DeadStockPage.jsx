import { useCallback, useEffect, useState } from 'react';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineExclamation } from 'react-icons/hi';
import Spinner from '../../shared/components/Spinner';
import DeadStockRow from './components/DeadStockRow';
import { FastMoverRowMemo, SlowMoverRowMemo } from './components/MoverRow';
import FastMoverChart from './components/FastMoverChart';

const TABS = [
  { key: 'dead', label: 'Dead Stock',  icon: HiOutlineExclamation },
  { key: 'fast', label: 'Fast Movers', icon: HiOutlineTrendingUp },
  { key: 'slow', label: 'Slow Movers', icon: HiOutlineTrendingDown },
];

export default function DeadStockPage() {
  const [activeTab, setActiveTab] = useState('dead');
  const [deadData,  setDeadData]  = useState(null);
  const [fastMovers, setFastMovers] = useState([]);
  const [slowMovers, setSlowMovers] = useState([]);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [deadRes, fastRes, slowRes] = await Promise.all([
        API.get(`/inventory-v2/dead-stock?days=${days}`),
        API.get('/inventory-v2/movers?days=30&type=fast&limit=15'),
        API.get('/inventory-v2/movers?days=30&type=slow&limit=15'),
      ]);
      setDeadData(deadRes.data.data);
      setFastMovers(fastRes.data.data);
      setSlowMovers(slowRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Spinner size="lg" padding="lg" />;

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Stock Analysis</h1>
      <p className="text-gray-500 text-sm mb-6">Dead stock, fast & slow movers</p>

      {deadData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card text-center border-2 border-red-100 bg-red-50/30">
            <p className="text-xs text-red-600 font-medium uppercase">Dead Stock (No sales in {days}d)</p>
            <p className="text-3xl font-heading font-bold text-red-700">{deadData.summary.count}</p>
            <p className="text-sm text-red-500">Value: {formatCurrency(deadData.summary.totalDeadValue)}</p>
          </div>
          <div className="card text-center border-2 border-green-100 bg-green-50/30">
            <p className="text-xs text-green-600 font-medium uppercase">Top Fast Mover (30d)</p>
            <p className="text-lg font-heading font-bold text-green-700 truncate">{fastMovers[0]?.medicineName || '—'}</p>
            <p className="text-sm text-green-500">{fastMovers[0]?.totalQty || 0} units sold</p>
          </div>
          <div className="card text-center border-2 border-amber-100 bg-amber-50/30">
            <p className="text-xs text-amber-600 font-medium uppercase">Slowest Mover (30d)</p>
            <p className="text-lg font-heading font-bold text-amber-700 truncate">{slowMovers[0]?.medicineName || '—'}</p>
            <p className="text-sm text-amber-500">{slowMovers[0]?.totalQty || 0} units sold</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.key ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
        {activeTab === 'dead' && (
          <select className="ml-2 text-sm border border-gray-200 rounded-lg px-2"
            value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
            {[30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d === 365 ? '1 year' : `${d} days`}</option>)}
          </select>
        )}
      </div>

      {activeTab === 'dead' && deadData && (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium">{deadData.summary.count} products with no sales in {days} days</span>
            <span className="text-sm text-red-600 font-bold">Total Value: {formatCurrency(deadData.summary.totalDeadValue)}</span>
          </div>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="table-header">
                  <th className="px-4 py-2">Medicine</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2 text-right">Stock</th>
                  <th className="px-4 py-2 text-right">Cost Value</th>
                  <th className="px-4 py-2 text-right">Retail Value</th>
                  <th className="px-4 py-2">Rack</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deadData.items.map((item) => <DeadStockRow key={item._id} item={item} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'fast' && (
        <div>
          <div className="card mb-4">
            <h3 className="font-heading font-semibold text-gray-900 mb-3">Top 15 Fast Moving Products (Last 30 Days)</h3>
            <FastMoverChart items={fastMovers} />
          </div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Medicine</th>
                  <th className="px-4 py-2 text-right">Qty Sold</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Avg/Day</th>
                  <th className="px-4 py-2 text-right">Current Stock</th>
                  <th className="px-4 py-2 text-right">Days of Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fastMovers.map((m, i) => <FastMoverRowMemo key={m._id || i} item={m} index={i} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'slow' && (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-gray-100">
            <span className="text-sm font-medium">Slowest Moving Products (Last 30 Days)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Medicine</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 text-right">Qty Sold</th>
                <th className="px-4 py-2 text-right">Current Stock</th>
                <th className="px-4 py-2">Rack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {slowMovers.map((m, i) => <SlowMoverRowMemo key={m._id || i} item={m} index={i} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
