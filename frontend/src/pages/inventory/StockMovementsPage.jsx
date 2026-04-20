import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { HiOutlineArrowUp, HiOutlineArrowDown, HiOutlineSearch } from 'react-icons/hi';

const TYPE_LABELS = {
  purchase: { label: 'Purchase', color: 'badge-green', icon: '📦' },
  sale: { label: 'Sale', color: 'badge-blue', icon: '🛒' },
  return_in: { label: 'Return (In)', color: 'badge-amber', icon: '↩️' },
  return_out: { label: 'Return (Out)', color: 'badge-amber', icon: '↪️' },
  adjustment_in: { label: 'Adjust (+)', color: 'badge-green', icon: '➕' },
  adjustment_out: { label: 'Adjust (-)', color: 'badge-red', icon: '➖' },
  transfer_in: { label: 'Transfer In', color: 'badge-blue', icon: '📥' },
  transfer_out: { label: 'Transfer Out', color: 'badge-blue', icon: '📤' },
  expired: { label: 'Expired', color: 'badge-red', icon: '⏰' },
  damaged: { label: 'Damaged', color: 'badge-red', icon: '💔' },
  opening: { label: 'Opening Stock', color: 'badge-gray', icon: '📋' },
};

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ movementType: '', direction: '', dateFrom: '', dateTo: '' });

  useEffect(() => { fetchData(); }, [page, filters]);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 50 });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    try {
      const [movRes, sumRes] = await Promise.all([
        API.get(`/inventory-v2/movements?${params}`),
        API.get(`/inventory-v2/movements/summary?dateFrom=${filters.dateFrom}&dateTo=${filters.dateTo}`),
      ]);
      setMovements(movRes.data.data);
      setPagination(movRes.data.pagination);
      setSummary(sumRes.data.data);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Stock Movement Register</h1>
      <p className="text-gray-500 text-sm mb-6">Complete audit trail of all stock ins & outs</p>

      {/* Summary Cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {summary.map((s, i) => {
            const info = TYPE_LABELS[s._id?.type] || { label: s._id?.type, color: 'badge-gray', icon: '📦' };
            return (
              <div key={i} className="card py-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{info.icon}</span>
                  <span className="text-xs font-semibold text-gray-500">{info.label}</span>
                  <span className={`badge text-[10px] ${s._id?.direction === 'in' ? 'badge-green' : 'badge-red'}`}>
                    {s._id?.direction === 'in' ? 'IN' : 'OUT'}
                  </span>
                </div>
                <p className="text-lg font-heading font-bold">{s.totalQty.toLocaleString()} units</p>
                <p className="text-xs text-gray-400">{s.count} transactions • {formatCurrency(s.totalValue)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <select className="input-field text-sm w-44" value={filters.movementType}
            onChange={(e) => { setFilters({ ...filters, movementType: e.target.value }); setPage(1); }}>
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="input-field text-sm w-32" value={filters.direction}
            onChange={(e) => { setFilters({ ...filters, direction: e.target.value }); setPage(1); }}>
            <option value="">All</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
          </select>
          <input type="date" className="input-field text-sm w-40" value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <input type="date" className="input-field text-sm w-40" value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          <button onClick={() => { setPage(1); fetchData(); }} className="btn-primary text-sm">Apply</button>
          <button onClick={() => { setFilters({ movementType: '', direction: '', dateFrom: '', dateTo: '' }); setPage(1); }} className="btn-ghost text-sm">Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Medicine</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-center">Balance</th>
                <th className="px-4 py-3 hidden lg:table-cell">Reference</th>
                <th className="px-4 py-3 hidden lg:table-cell">User</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {movements.map(m => {
                  const info = TYPE_LABELS[m.movementType] || { label: m.movementType, color: 'badge-gray' };
                  return (
                    <tr key={m._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-xs text-gray-500">{formatDateTime(m.createdAt)}</td>
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900 text-xs">{m.medicineId?.medicineName || '—'}</p>
                        <p className="text-[10px] text-gray-400">{m.medicineId?.genericName}</p>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`badge ${info.color} text-[10px]`}>{info.label}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[10px] text-gray-500">{m.batchNumber || '—'}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center gap-0.5 font-bold ${m.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {m.direction === 'in' ? <HiOutlineArrowUp className="w-3 h-3" /> : <HiOutlineArrowDown className="w-3 h-3" />}
                          {m.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-xs">
                        <span className="text-gray-400">{m.balanceBefore}</span>
                        <span className="mx-1">→</span>
                        <span className="font-bold">{m.balanceAfter}</span>
                      </td>
                      <td className="px-4 py-2 hidden lg:table-cell text-xs text-gray-400">{m.referenceNo || '—'}</td>
                      <td className="px-4 py-2 hidden lg:table-cell text-xs text-gray-500">{m.userId?.name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} records)</p>
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
