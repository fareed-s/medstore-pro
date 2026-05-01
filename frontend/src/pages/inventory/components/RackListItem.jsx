import { memo, useCallback } from 'react';
import { HiOutlineLocationMarker } from 'react-icons/hi';

function RackListItem({ rack, active, onSelect }) {
  const handle = useCallback(() => onSelect(rack._id), [onSelect, rack._id]);
  return (
    <button onClick={handle}
      className={`w-full px-4 py-3 text-left hover:bg-primary-50/50 transition-colors ${active ? 'bg-primary-50 border-l-4 border-primary-500' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
          <HiOutlineLocationMarker className="w-4 h-4 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{rack._id}</p>
          <p className="text-xs text-gray-400">{rack.productCount} products • {rack.totalStock} units</p>
        </div>
        {rack.outOfStock > 0 && <span className="badge badge-red text-[10px]">{rack.outOfStock} OOS</span>}
      </div>
    </button>
  );
}

export default memo(RackListItem);
