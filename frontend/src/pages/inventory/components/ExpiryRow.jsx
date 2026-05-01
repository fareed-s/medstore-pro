import { memo } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../../utils/helpers';

const DATE_COLOR = {
  expired:  'text-red-600',
  within30: 'text-red-600',
  within60: 'text-amber-600',
  within90: 'text-emerald-600',
};

function ExpiryRow({ batch: b, tab }) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <Link to={`/medicines/${b.medicineId?._id}`} className="font-medium text-gray-900 hover:text-primary-600">
          {b.medicineId?.medicineName || 'Unknown'}
        </Link>
        <p className="text-xs text-gray-400">{b.medicineId?.genericName}</p>
      </td>
      <td className="px-4 py-3 font-mono text-xs">{b.batchNumber}</td>
      <td className="px-4 py-3">
        <span className={`font-medium ${DATE_COLOR[tab] || ''}`}>{formatDate(b.expiryDate)}</span>
      </td>
      <td className="px-4 py-3 font-semibold">{b.remainingQty}</td>
      <td className="px-4 py-3 text-gray-600">
        {formatCurrency(b.remainingQty * (b.medicineId?.salePrice || 0))}
      </td>
    </tr>
  );
}

export default memo(ExpiryRow);
