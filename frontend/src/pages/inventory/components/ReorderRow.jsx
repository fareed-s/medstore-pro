import { memo } from 'react';
import { formatCurrency } from '../../../utils/helpers';

const URGENCY = { critical: 'badge-red', high: 'badge-amber', medium: 'badge-blue' };

function ReorderRow({ item }) {
  return (
    <tr className={`hover:bg-gray-50/50 ${item.urgency === 'critical' ? 'bg-red-50/30' : ''}`}>
      <td className="px-4 py-3">
        <p className="font-medium text-xs">{item.medicineName}</p>
        <p className="text-[10px] text-gray-400">{item.genericName} • {item.manufacturer}</p>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{item.category}</td>
      <td className="px-4 py-3 text-center">
        <span className={`font-bold ${item.currentStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>{item.currentStock}</span>
      </td>
      <td className="px-4 py-3 text-center text-gray-500">{item.reorderLevel}</td>
      <td className="px-4 py-3 text-center font-semibold text-primary-600">{item.suggestedQty}</td>
      <td className="px-4 py-3 text-right">{formatCurrency(item.estimatedCost)}</td>
      <td className="px-4 py-3"><span className={`badge ${URGENCY[item.urgency]}`}>{item.urgency}</span></td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{item.rackLocation || '—'}</td>
    </tr>
  );
}

export default memo(ReorderRow);
