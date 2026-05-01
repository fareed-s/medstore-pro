import { memo } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineUpload } from 'react-icons/hi';
import { useAuth } from '../../../context/AuthContext';

function MedicineHeader({ total, onBulkImport }) {
  const { hasRole } = useAuth();
  const canManage = hasRole('SuperAdmin', 'StoreAdmin', 'Pharmacist');
  const canBulk   = hasRole('SuperAdmin', 'StoreAdmin');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">Medicines</h1>
        <p className="text-gray-500 text-sm">{total || 0} products in inventory</p>
      </div>
      {canManage && (
        <div className="flex gap-2">
          {canBulk && onBulkImport && (
            <button onClick={onBulkImport} className="btn-secondary flex items-center gap-2">
              <HiOutlineUpload className="w-4 h-4" /> Bulk Upload
            </button>
          )}
          <Link to="/medicines/new" className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> Add Medicine
          </Link>
        </div>
      )}
    </div>
  );
}

export default memo(MedicineHeader);
