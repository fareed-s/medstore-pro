import { memo, useCallback } from 'react';
import { TYPE_LABELS } from './MOVEMENT_TYPES';

function StockMovementFilters({ filters, onChange, onApply, onReset }) {
  const set = useCallback((k) => (e) => onChange({ [k]: e.target.value }), [onChange]);

  return (
    <div className="card mb-4">
      <div className="flex flex-wrap gap-3">
        <select className="input-field text-sm w-44" value={filters.movementType} onChange={set('movementType')}>
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input-field text-sm w-32" value={filters.direction} onChange={set('direction')}>
          <option value="">All</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
        </select>
        <input type="date" className="input-field text-sm w-40" value={filters.dateFrom} onChange={set('dateFrom')} />
        <input type="date" className="input-field text-sm w-40" value={filters.dateTo}   onChange={set('dateTo')} />
        <button onClick={onApply} className="btn-primary text-sm">Apply</button>
        <button onClick={onReset} className="btn-ghost text-sm">Reset</button>
      </div>
    </div>
  );
}

export default memo(StockMovementFilters);
