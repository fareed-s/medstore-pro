import { memo, useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { HiOutlineSearch } from 'react-icons/hi';
import { selectSuppliersFilters, setFilter } from '../suppliersSlice';

function SupplierFilters({ onSearch }) {
  const dispatch = useDispatch();
  const filters = useSelector(selectSuppliersFilters, shallowEqual);
  const onChange = useCallback((e) => dispatch(setFilter({ search: e.target.value })), [dispatch]);
  const onKey    = useCallback((e) => { if (e.key === 'Enter') onSearch(); }, [onSearch]);

  return (
    <div className="card mb-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search suppliers..."
            value={filters.search} onChange={onChange} onKeyDown={onKey} />
        </div>
        <button onClick={onSearch} className="btn-primary text-sm">Search</button>
      </div>
    </div>
  );
}

export default memo(SupplierFilters);
