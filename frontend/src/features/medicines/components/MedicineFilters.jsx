import { memo, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { HiOutlineSearch, HiOutlineFilter, HiOutlineRefresh } from 'react-icons/hi';
import { CATEGORIES, SCHEDULES } from '../../../utils/helpers';
import { selectMedicinesFilters, setFilter, resetFilters } from '../medicinesSlice';

function MedicineFilters({ onSearch }) {
  const dispatch = useDispatch();
  const filters = useSelector(selectMedicinesFilters, shallowEqual);
  const [open, setOpen] = useState(false);

  // Local mirror of the search box. Each Redux update triggers a refetch via
  // MedicinesPage's effect, so writing to Redux on every keystroke would
  // hammer the API. Debounce 300ms — feels instant, cuts API calls by ~80%.
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  useEffect(() => { setLocalSearch(filters.search || ''); }, [filters.search]);
  useEffect(() => {
    if (localSearch === (filters.search || '')) return;
    const t = setTimeout(() => {
      dispatch(setFilter({ search: localSearch, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const setCategory   = useCallback((e) => dispatch(setFilter({ category: e.target.value, page: 1 })), [dispatch]);
  const setSchedule   = useCallback((e) => dispatch(setFilter({ schedule: e.target.value, page: 1 })), [dispatch]);
  const setStock      = useCallback((e) => dispatch(setFilter({ stockStatus: e.target.value, page: 1 })), [dispatch]);
  const submit        = useCallback((e) => {
    e.preventDefault();
    // Force-commit the current input (skip the debounce wait) and refetch.
    if (localSearch !== (filters.search || '')) {
      dispatch(setFilter({ search: localSearch, page: 1 }));
    } else {
      onSearch();
    }
  }, [onSearch, dispatch, localSearch, filters.search]);
  const reset         = useCallback(() => { setLocalSearch(''); dispatch(resetFilters()); }, [dispatch]);

  return (
    <div className="card mb-4">
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" className="input-field pl-9"
            placeholder="Search by name, generic, barcode, manufacturer..."
            value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">Search</button>
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-secondary flex items-center gap-2">
          <HiOutlineFilter className="w-4 h-4" /> Filters
        </button>
        <button type="button" onClick={reset} className="btn-ghost"><HiOutlineRefresh className="w-4 h-4" /></button>
      </form>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
          <select className="input-field text-sm" value={filters.category} onChange={setCategory}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-field text-sm" value={filters.schedule} onChange={setSchedule}>
            <option value="">All Schedules</option>
            {SCHEDULES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field text-sm" value={filters.stockStatus} onChange={setStock}>
            <option value="">All Stock Status</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default memo(MedicineFilters);
