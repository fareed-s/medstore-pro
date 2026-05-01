import { memo } from 'react';
import { HiOutlineArrowUp, HiOutlineArrowDown } from 'react-icons/hi';
import { formatDateTime } from '../../../utils/helpers';
import { TYPE_LABELS } from './MOVEMENT_TYPES';

function StockMovementRow({ movement: m }) {
  const info = TYPE_LABELS[m.movementType] || { label: m.movementType, color: 'badge-gray' };
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-2 text-xs text-gray-500">{formatDateTime(m.createdAt)}</td>
      <td className="px-4 py-2">
        <p className="font-medium text-gray-900 text-xs">{m.medicineId?.medicineName || '—'}</p>
        <p className="text-[10px] text-gray-400">{m.medicineId?.genericName}</p>
      </td>
      <td className="px-4 py-2"><span className={`badge ${info.color} text-[10px]`}>{info.label}</span></td>
      <td className="px-4 py-2 font-mono text-[10px] text-gray-500">{m.batchNumber || '—'}</td>
      <td className="px-4 py-2 text-center">
        <span className={`inline-flex items-center gap-0.5 font-bold ${m.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
          {m.direction === 'in' ? <HiOutlineArrowUp className="w-3 h-3" /> : <HiOutlineArrowDown className="w-3 h-3" />}
          {m.quantity}
        </span>
      </td>
      <td className="px-4 py-2 text-center text-xs">
        <span className="text-gray-400">{m.balanceBefore}</span>
        <span className="mx-1">→</span>
        <span className="font-bold">{m.balanceAfter}</span>
      </td>
      <td className="px-4 py-2 hidden lg:table-cell text-xs text-gray-400">{m.referenceNo || '—'}</td>
      <td className="px-4 py-2 hidden lg:table-cell text-xs text-gray-500">{m.userId?.name || '—'}</td>
    </tr>
  );
}

export default memo(StockMovementRow);
