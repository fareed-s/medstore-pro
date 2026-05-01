import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import {
  HiOutlineCube, HiOutlineBan, HiOutlineExclamation, HiOutlineClock, HiOutlineArchive,
} from 'react-icons/hi';
import Spinner from '../../shared/components/Spinner';
import InventoryStats from './components/InventoryStats';
import CategoryStockChart from './components/CategoryStockChart';
import CategoryStockTable from './components/CategoryStockTable';

export default function InventoryPage() {
  const [data, setData] = useState(null);
  const [catStock, setCatStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/inventory/overview'),
      API.get('/inventory/category-stock'),
    ])
      .then(([ov, cat]) => { setData(ov.data.data); setCatStock(cat.data.data); })
      .finally(() => setLoading(false));
  }, []);

  // useMemo: stats array is rebuilt only when underlying counts change.
  const stats = useMemo(() => ([
    { label: 'Total Products',  value: data?.totalActive  || 0, icon: HiOutlineCube,        color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Out of Stock',    value: data?.outOfStock   || 0, icon: HiOutlineBan,         color: 'text-red-600',     bg: 'bg-red-50',     link: '/medicines?stockStatus=out' },
    { label: 'Low Stock',       value: data?.lowStock     || 0, icon: HiOutlineExclamation, color: 'text-amber-600',   bg: 'bg-amber-50',   link: '/medicines?stockStatus=low' },
    { label: 'Expiring Soon',   value: data?.expiringSoon || 0, icon: HiOutlineClock,       color: 'text-orange-600',  bg: 'bg-orange-50',  link: '/inventory/expiry' },
    { label: 'Expired Batches', value: data?.expired      || 0, icon: HiOutlineBan,         color: 'text-red-600',     bg: 'bg-red-50' },
    { label: 'Active Batches',  value: data?.totalBatches || 0, icon: HiOutlineArchive,     color: 'text-blue-600',    bg: 'bg-blue-50' },
  ]), [data]);

  if (loading) return <Spinner size="lg" padding="lg" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Inventory Overview</h1>
          <p className="text-gray-500 text-sm">Stock, expiry, and category breakdown</p>
        </div>
        <Link to="/inventory/expiry" className="btn-primary">Expiry Dashboard</Link>
      </div>

      <InventoryStats stats={stats} />

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

      <div className="card">
        <h3 className="font-heading font-semibold text-gray-900 mb-4">Stock by Category</h3>
        {catStock.length > 0 ? (
          <>
            <CategoryStockChart catStock={catStock} />
            <CategoryStockTable catStock={catStock} />
          </>
        ) : <p className="text-gray-400 text-center py-8">No data</p>}
      </div>
    </div>
  );
}
