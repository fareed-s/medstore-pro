import { memo, useCallback } from 'react';
import { formatCurrency } from '../../../utils/helpers';

const COLOR_DOT  = { red: 'bg-red-500', amber: 'bg-amber-500', green: 'bg-emerald-500' };
const COLOR_BG   = { red: 'bg-red-50 border-red-200', amber: 'bg-amber-50 border-amber-200', green: 'bg-emerald-50 border-emerald-200' };
const COLOR_TEXT = { red: 'text-red-700', amber: 'text-amber-700', green: 'text-emerald-700' };

const ExpiryTab = memo(function ExpiryTab({ tab, active, onClick }) {
  const handle = useCallback(() => onClick(tab.key), [onClick, tab.key]);
  return (
    <button onClick={handle}
      className={`card text-left transition-all duration-200 border-2 ${active ? COLOR_BG[tab.color] : 'border-transparent hover:border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${COLOR_DOT[tab.color]}`} />
        <span className="text-xs font-semibold text-gray-500 uppercase">{tab.label}</span>
      </div>
      <p className={`text-2xl font-heading font-bold ${COLOR_TEXT[tab.color]}`}>{tab.count}</p>
      <p className="text-xs text-gray-400 mt-1">Value: {formatCurrency(tab.value)}</p>
    </button>
  );
});

function ExpiryTabs({ tabs, activeKey, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {tabs.map((t) => <ExpiryTab key={t.key} tab={t} active={activeKey === t.key} onClick={onSelect} />)}
    </div>
  );
}

export default memo(ExpiryTabs);
export { COLOR_DOT };
