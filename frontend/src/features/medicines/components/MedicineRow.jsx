import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiOutlinePlus } from 'react-icons/hi';
import { formatCurrency, getStockStatus, getScheduleBadge } from '../../../utils/helpers';
import { makeSelectMedicineById } from '../medicinesSlice';
import { useAuth } from '../../../context/AuthContext';
import QuickAddStockModal from './QuickAddStockModal';

function MedicineRow({ medicineId }) {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const m = useSelector(makeSelectMedicineById(medicineId));
  const [showAddStock, setShowAddStock] = useState(false);
  if (!m) return null;

  const stock = getStockStatus(m.currentStock, m.lowStockThreshold);
  const sch   = getScheduleBadge(m.schedule);
  const canAddStock = hasRole('SuperAdmin', 'StoreAdmin', 'InventoryStaff', 'Pharmacist');

  return (
    <>
      <tr className="hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/medicines/${m._id}`)}>
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900">{m.medicineName}</p>
          <p className="text-xs text-gray-400">{m.genericName}{m.manufacturer ? ` • ${m.manufacturer}` : ''}</p>
          <p className="text-xs text-gray-300 font-mono">{m.barcode}</p>
        </td>
        <td className="px-4 py-3 hidden md:table-cell"><span className="badge badge-gray">{m.category}</span></td>
        <td className="px-4 py-3 hidden lg:table-cell"><span className={`badge ${sch.bg} ${sch.text}`}>{m.schedule}</span></td>
        <td className="px-4 py-3">
          <p className="font-semibold text-gray-900">{formatCurrency(m.salePrice)}</p>
          <p className="text-xs text-gray-400">MRP: {formatCurrency(m.mrp)}</p>
        </td>
        <td className="px-4 py-3"><span className={`badge badge-${stock.color}`}>{m.currentStock} — {stock.label}</span></td>
        <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">{m.rackLocation || '—'}</td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          {canAddStock && (
            <button
              onClick={() => setShowAddStock(true)}
              title="Add stock to this medicine"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition-colors"
            >
              <HiOutlinePlus className="w-3.5 h-3.5" /> Stock
            </button>
          )}
        </td>
      </tr>
      {showAddStock && (
        <QuickAddStockModal medicine={m} onClose={() => setShowAddStock(false)} />
      )}
    </>
  );
}

export default memo(MedicineRow);
