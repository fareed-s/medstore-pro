import { useCallback, useEffect, useState } from 'react';
import API from '../../utils/api';
import Spinner from '../../shared/components/Spinner';
import ActivityLogRow from './components/ActivityLogRow';

const MODULES = ['auth','store','medicine','inventory','batch','category','sale','purchase','customer','prescription','expense','settings','user','report'];

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ module: '', dateFrom: '', dateTo: '' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (filters.module)   params.set('module', filters.module);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo)   params.set('dateTo', filters.dateTo);
      const { data } = await API.get(`/activity-logs?${params}`);
      setLogs(data.data);
      setTotal(data.pagination?.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const setFilter = useCallback((k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }));
    if (k === 'module') setPage(1);
  }, []);
  const onApply = useCallback(() => { setPage(1); fetchLogs(); }, [fetchLogs]);

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Activity Log</h1>
      <p className="text-gray-500 text-sm mb-6">Complete audit trail — every action logged</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select className="input-field text-sm w-36" value={filters.module} onChange={setFilter('module')}>
          <option value="">All Modules</option>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="date" className="input-field text-sm w-40" value={filters.dateFrom} onChange={setFilter('dateFrom')} />
        <input type="date" className="input-field text-sm w-40" value={filters.dateTo}   onChange={setFilter('dateTo')} />
        <button onClick={onApply} className="btn-primary text-sm">Filter</button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? <Spinner />
          : logs.length === 0
            ? <p className="text-center py-12 text-gray-400">No activity logs</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Module</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map((log) => <ActivityLogRow key={log._id} log={log} />)}
                  </tbody>
                </table>
              </div>
            )}
        {total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-gray-500">{total} total</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost text-xs px-3 py-1 disabled:opacity-30">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= total} className="btn-ghost text-xs px-3 py-1 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
