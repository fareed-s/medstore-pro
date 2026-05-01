import { memo } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../utils/helpers';

function CategoryMedicineRow({ medicine: med }) {
  const stockClass = med.currentStock <= 0
    ? 'text-red-600'
    : med.currentStock <= (med.lowStockThreshold || 10)
      ? 'text-amber-600'
      : 'text-green-600';
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-2">
        <Link to={`/medicines/${med._id}`} className="font-medium text-primary-700 hover:underline">{med.medicineName}</Link>
        <p className="text-[10px] text-gray-400 font-mono">{med.barcode}</p>
      </td>
      <td className="px-4 py-2 hidden md:table-cell text-gray-500 text-xs">{med.genericName}</td>
      <td className="px-4 py-2 hidden lg:table-cell text-gray-400 text-xs">{med.manufacturer}</td>
      <td className="px-4 py-2 text-center">
        <span className={`font-bold ${stockClass}`}>{med.currentStock}</span>
      </td>
      <td className="px-4 py-2 text-right font-bold text-primary-600">{formatCurrency(med.salePrice)}</td>
      <td className="px-4 py-2 hidden md:table-cell">
        <span className={`badge text-[9px] ${med.schedule === 'OTC' ? 'badge-green' : med.schedule?.includes('X') ? 'badge-red' : 'badge-amber'}`}>
          {med.schedule}
        </span>
      </td>
    </tr>
  );
}

export default memo(CategoryMedicineRow);
