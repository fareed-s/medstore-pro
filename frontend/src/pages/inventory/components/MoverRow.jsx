import { memo } from 'react';
import { formatCurrency } from '../../../utils/helpers';

function FastMoverRow({ item: m, index }) {
  const dayClass = m.daysOfStock < 7 ? 'text-red-600'
    : m.daysOfStock < 14 ? 'text-amber-600' : 'text-green-600';
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-2 text-gray-400">{index + 1}</td>
      <td className="px-4 py-2 font-medium text-xs">{m.medicineName}</td>
      <td className="px-4 py-2 text-right font-bold text-primary-600">{m.totalQty}</td>
      <td className="px-4 py-2 text-right">{formatCurrency(m.totalRevenue)}</td>
      <td className="px-4 py-2 text-right text-gray-500">{m.avgDailySales}</td>
      <td className="px-4 py-2 text-right">{m.currentStock}</td>
      <td className="px-4 py-2 text-right">
        {m.daysOfStock !== null
          ? <span className={`font-medium ${dayClass}`}>{m.daysOfStock}d</span>
          : '—'}
      </td>
    </tr>
  );
}

function SlowMoverRow({ item: m, index }) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-2 text-gray-400">{index + 1}</td>
      <td className="px-4 py-2 font-medium text-xs">{m.medicineName}</td>
      <td className="px-4 py-2 text-xs text-gray-500">{m.category}</td>
      <td className="px-4 py-2 text-right text-amber-600 font-medium">{m.totalQty}</td>
      <td className="px-4 py-2 text-right">{m.currentStock}</td>
      <td className="px-4 py-2 text-xs text-gray-400">{m.rackLocation || '—'}</td>
    </tr>
  );
}

export const FastMoverRowMemo = memo(FastMoverRow);
export const SlowMoverRowMemo = memo(SlowMoverRow);
