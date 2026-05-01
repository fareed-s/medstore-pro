import { memo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectPrescriptionsFilters, setFilter } from '../prescriptionsSlice';

const TABS = ['', 'active', 'partial', 'dispensed', 'expired'];

function StatusTabs() {
  const dispatch = useDispatch();
  const filters = useSelector(selectPrescriptionsFilters);
  const set = useCallback((s) => () => dispatch(setFilter({ status: s })), [dispatch]);
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {TABS.map((s) => (
        <button key={s} onClick={set(s)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filters.status === s
            ? 'bg-primary-600 text-white'
            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          {s || 'All'}
        </button>
      ))}
    </div>
  );
}

export default memo(StatusTabs);
