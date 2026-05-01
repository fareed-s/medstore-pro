import { useCallback, useEffect, useState } from 'react';
import API from '../../utils/api';
import Spinner from '../../shared/components/Spinner';
import Pagination from '../../shared/components/Pagination';
import StockMovementSummary from './components/StockMovementSummary';
import StockMovementFilters from './components/StockMovementFilters';
import StockMovementRow from './components/StockMovementRow';

const blankFilters = { movementType: '', direction: '', dateFrom: '', dateTo: '' };

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(blankFilters);

  const fetchData = useCallback(async () => {
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onFilterChange = useCallback((patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    if ('movementType' in patch || 'direction' in patch) setPage(1);
  }, []);
  const onApply = useCallback(() => { setPage(1); fetchData(); }, [fetchData]);
  const onReset = useCallback(() => { setFilters(blankFilters); setPage(1); }, []);

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Stock Movement Register</h1>
      <p className="text-gray-500 text-sm mb-6">Complete audit trail of all stock ins & outs</p>

      <StockMovementSummary summary={summary} />
      <StockMovementFilters filters={filters} onChange={onFilterChange} onApply={onApply} onReset={onReset} />

      <div className="card overflow-hidden p-0">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-center">Balance</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Reference</th>
                  <th className="px-4 py-3 hidden lg:table-cell">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movements.map((m) => <StockMovementRow key={m._id} movement={m} />)}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} />
      </div>
    </div>
  );
}
