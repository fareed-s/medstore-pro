import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiOutlinePencil, HiOutlineEye, HiOutlineStar } from 'react-icons/hi';
import { formatCurrency } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import { makeSelectSupplierById } from '../suppliersSlice';

const STARS = [1, 2, 3, 4, 5];

function SupplierRow({ supplierId, onEdit }) {
  const { hasRole } = useAuth();
  const s = useSelector(makeSelectSupplierById(supplierId));
  const handleEdit = useCallback(() => onEdit?.(supplierId), [onEdit, supplierId]);
  if (!s) return null;

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900">{s.supplierName}</p>
        <p className="text-xs text-gray-400">{s.companyName}</p>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-gray-500">{s.phone}</td>
      <td className="px-4 py-3 hidden lg:table-cell"><span className="badge badge-blue text-[10px]">{s.paymentTerms}</span></td>
      <td className="px-4 py-3 text-right">
        <span className={`font-bold ${s.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(s.currentBalance)}
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{s.drugLicenseNumber || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex gap-0.5">
          {STARS.map((i) => (
            <HiOutlineStar key={i} className={`w-3.5 h-3.5 ${i <= (s.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Link to={`/purchase/suppliers/${s._id}`} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <HiOutlineEye className="w-4 h-4 text-gray-500" />
          </Link>
          {hasRole('SuperAdmin', 'StoreAdmin') && (
            <button onClick={handleEdit} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <HiOutlinePencil className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default memo(SupplierRow);
