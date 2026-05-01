import { memo, useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { HiOutlineSearch } from 'react-icons/hi';
import { selectCustomersFilters, setFilter } from '../customersSlice';

const TYPES = ['regular', 'chronic', 'wholesale', 'insurance', 'employee'];

function CustomerFilters({ onSearch }) {
  const dispatch = useDispatch();
  // shallowEqual — re-render only when the actual filter values change,
  // not when the surrounding state slice mutates for unrelated reasons.
  const filters = useSelector(selectCustomersFilters, shallowEqual);

  const onSearchChange = useCallback(
    (e) => dispatch(setFilter({ search: e.target.value })),
    [dispatch]
  );
  const onTypeChange = useCallback(
    (e) => dispatch(setFilter({ type: e.target.value })),
    [dispatch]
  );
  const onKeyDown = useCallback(
    (e) => { if (e.key === 'Enter') onSearch(); },
    [onSearch]
  );

  return (
    <div className="card mb-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 relative min-w-[200px]">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by name or phone..."
            value={filters.search}
            onChange={onSearchChange}
            onKeyDown={onKeyDown}
          />
        </div>
        <select className="input-field w-40 text-sm" value={filters.type} onChange={onTypeChange}>
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={onSearch} className="btn-primary text-sm">Search</button>
      </div>
    </div>
  );
}

export default memo(CustomerFilters);
