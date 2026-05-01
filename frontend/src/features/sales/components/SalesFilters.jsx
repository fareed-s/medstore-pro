import { memo, useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { HiOutlineSearch } from 'react-icons/hi';
import { selectSalesFilters, setFilter } from '../salesSlice';

const STATUSES = [
  ['', 'All Status'], ['completed', 'Completed'], ['voided', 'Voided'],
  ['returned', 'Returned'], ['partial_return', 'Partial Return'],
];

function SalesFilters({ onSearch }) {
  const dispatch = useDispatch();
  const filters = useSelector(selectSalesFilters, shallowEqual);

  const setSearch   = useCallback((e) => dispatch(setFilter({ search: e.target.value })), [dispatch]);
  const setStatus   = useCallback((e) => dispatch(setFilter({ status: e.target.value, page: 1 })), [dispatch]);
  const setDateFrom = useCallback((e) => dispatch(setFilter({ dateFrom: e.target.value })), [dispatch]);
  const setDateTo   = useCallback((e) => dispatch(setFilter({ dateTo: e.target.value })), [dispatch]);
  const onKey       = useCallback((e) => { if (e.key === 'Enter') onSearch(); }, [onSearch]);

  return (
    <div className="card mb-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9 text-sm" placeholder="Search by invoice, customer..."
            value={filters.search} onChange={setSearch} onKeyDown={onKey} />
        </div>
        <select className="input-field text-sm w-40" value={filters.status} onChange={setStatus}>
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" className="input-field text-sm w-40" value={filters.dateFrom} onChange={setDateFrom} />
        <input type="date" className="input-field text-sm w-40" value={filters.dateTo}   onChange={setDateTo} />
        <button onClick={onSearch} className="btn-primary text-sm">Filter</button>
      </div>
    </div>
  );
}

export default memo(SalesFilters);
