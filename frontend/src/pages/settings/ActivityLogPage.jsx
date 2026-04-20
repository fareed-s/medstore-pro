import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatDateTime } from '../../utils/helpers';

const MODULES = ['auth','store','medicine','inventory','batch','category','sale','purchase','customer','prescription','expense','settings','user','report'];

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ module: '', dateFrom: '', dateTo: '' });

  useEffect(() => { fetchLogs(); }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (filters.module) params.set('module', filters.module);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const { data } = await API.get(`/activity-logs?${params}`);
      setLogs(data.data); setTotal(data.pagination?.total || 0);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const modColors = { auth:'badge-blue', sale:'badge-green', medicine:'badge-amber', purchase:'badge-blue', inventory:'badge-amber', customer:'badge-green', expense:'bg-red-100 text-red-700' };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Activity Log</h1>
      <p className="text-gray-500 text-sm mb-6">Complete audit trail — every action logged</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select className="input-field text-sm w-36" value={filters.module} onChange={(e) => { setFilters({ ...filters, module: e.target.value }); setPage(1); }}>
          <option value="">All Modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="date" className="input-field text-sm w-40" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
        <input type="date" className="input-field text-sm w-40" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
        <button onClick={() => { setPage(1); fetchLogs(); }} className="btn-primary text-sm">Filter</button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : logs.length === 0 ? <p className="text-center py-12 text-gray-400">No activity logs</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th><th className="px-4 py-3 hidden lg:table-cell">Details</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-xs text-gray-500">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-2 text-xs font-medium">{log.userId?.name || '—'}</td>
                    <td className="px-4 py-2"><span className={`badge text-[10px] ${modColors[log.module] || 'badge-gray'}`}>{log.module}</span></td>
                    <td className="px-4 py-2 text-xs">{log.action}</td>
                    <td className="px-4 py-2 hidden lg:table-cell text-xs text-gray-400 max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-gray-500">{total} total</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost text-xs px-3 py-1 disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total} className="btn-ghost text-xs px-3 py-1 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
