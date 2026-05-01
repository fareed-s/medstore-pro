import { memo } from 'react';
import { formatCurrency } from '../../../utils/helpers';

function DeadStockRow({ item }) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-2">
        <p className="font-medium text-xs">{item.medicineName}</p>
        <p className="text-[10px] text-gray-400">{item.genericName}</p>
      </td>
      <td className="px-4 py-2 text-xs text-gray-500">{item.category}</td>
      <td className="px-4 py-2 text-right font-semibold">{item.currentStock}</td>
      <td className="px-4 py-2 text-right text-red-600 font-medium">{formatCurrency(item.stockValue)}</td>
      <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(item.retailValue)}</td>
      <td className="px-4 py-2 text-xs text-gray-400">{item.rackLocation || '—'}</td>
    </tr>
  );
}

export default memo(DeadStockRow);
