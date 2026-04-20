import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlineEye, HiOutlineBan, HiOutlineReceiptRefund, HiOutlineSearch } from 'react-icons/hi';

export default function SalesPage() {
  const { hasRole } = useAuth();
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Today summary
  const [summary, setSummary] = useState(null);

  useEffect(() => { fetchSales(); }, [page, statusFilter]);
  useEffect(() => { fetchSummary(); }, []);

  const fetchSales = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 25 });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    try {
      const { data } = await API.get(`/sales?${params}`);
      setSales(data.data);
      setPagination(data.pagination);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    try { const { data } = await API.get('/sales/today-summary'); setSummary(data.data); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const voidSale = async (id) => {
    const reason = window.prompt('Enter void reason:');
    if (!reason) return;
    try {
      await API.post(`/sales/${id}/void`, { reason });
      toast.success('Sale voided');
      fetchSales();
      fetchSummary();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const statusBadge = {
    completed: 'badge-green', held: 'badge-amber', voided: 'badge-red',
    returned: 'badge-gray', partial_return: 'badge-blue',
  };

  return (
    <div>
      {/* Today Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card text-center py-4">
            <p className="text-xs text-gray-500">Today's Sales</p>
            <p className="text-2xl font-heading font-bold text-gray-900">{summary.summary?.totalSales || 0}</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-2xl font-heading font-bold text-primary-600">{formatCurrency(summary.summary?.totalRevenue || 0)}</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-xs text-gray-500">Avg Bill</p>
            <p className="text-2xl font-heading font-bold text-gray-900">{formatCurrency(summary.summary?.avgBillValue || 0)}</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-xs text-gray-500">Items Sold</p>
            <p className="text-2xl font-heading font-bold text-gray-900">{summary.summary?.totalItems || 0}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Sales History</h1>
          <p className="text-gray-500 text-sm">{pagination.total || 0} transactions</p>
        </div>
        <Link to="/pos" className="btn-primary">Open POS Terminal</Link>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9 text-sm" placeholder="Search by invoice, customer..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchSales()} />
          </div>
          <select className="input-field text-sm w-40" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
            <option value="returned">Returned</option>
            <option value="partial_return">Partial Return</option>
          </select>
          <input type="date" className="input-field text-sm w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="input-field text-sm w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button onClick={() => { setPage(1); fetchSales(); }} className="btn-primary text-sm">Filter</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No sales found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 hidden md:table-cell">Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 hidden md:table-cell">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden lg:table-cell">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {sales.map(sale => (
                  <tr key={sale._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-primary-600">{sale.invoiceNo}</span>
                      <p className="text-[10px] text-gray-400">{sale.cashierName}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{sale.customerName}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">{sale.items?.length}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(sale.netTotal)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="badge badge-gray">{sale.payments?.[0]?.method || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusBadge[sale.status] || 'badge-gray'}`}>{sale.status}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDateTime(sale.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link to={`/sales/${sale._id}`} className="p-1.5 hover:bg-gray-100 rounded-lg" title="View"><HiOutlineEye className="w-4 h-4 text-gray-500" /></Link>
                        {sale.status === 'completed' && hasRole('SuperAdmin', 'StoreAdmin', 'Pharmacist') && (
                          <>
                            <button onClick={() => voidSale(sale._id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Void"><HiOutlineBan className="w-4 h-4 text-red-400" /></button>
                            <Link to={`/sales/${sale._id}/return`} className="p-1.5 hover:bg-blue-50 rounded-lg" title="Return"><HiOutlineReceiptRefund className="w-4 h-4 text-blue-400" /></Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost text-xs px-3 py-1 disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages} className="btn-ghost text-xs px-3 py-1 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
