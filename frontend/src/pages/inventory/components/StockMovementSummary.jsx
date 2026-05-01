import { memo } from 'react';
import { formatCurrency } from '../../../utils/helpers';
import { TYPE_LABELS } from './MOVEMENT_TYPES';

const SummaryCard = memo(function SummaryCard({ row }) {
  const info = TYPE_LABELS[row._id?.type] || { label: row._id?.type, color: 'badge-gray', icon: '📦' };
  return (
    <div className="card py-3 px-4">
      <div className="flex items-center gap-2 mb-1">
        <span>{info.icon}</span>
        <span className="text-xs font-semibold text-gray-500">{info.label}</span>
        <span className={`badge text-[10px] ${row._id?.direction === 'in' ? 'badge-green' : 'badge-red'}`}>
          {row._id?.direction === 'in' ? 'IN' : 'OUT'}
        </span>
      </div>
      <p className="text-lg font-heading font-bold">{row.totalQty.toLocaleString()} units</p>
      <p className="text-xs text-gray-400">{row.count} transactions • {formatCurrency(row.totalValue)}</p>
    </div>
  );
});

function StockMovementSummary({ summary }) {
  if (!summary?.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {summary.map((s, i) => <SummaryCard key={i} row={s} />)}
    </div>
  );
}

export default memo(StockMovementSummary);
