import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { HiOutlinePlus } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { fetchSuppliers, selectSuppliersCount, selectSuppliersFilters } from './suppliersSlice';
import SupplierFilters from './components/SupplierFilters';
import SupplierForm from './components/SupplierForm';
import SupplierTable from './components/SupplierTable';

export default function SuppliersPage() {
  const dispatch = useDispatch();
  const { hasRole } = useAuth();
  const count = useSelector(selectSuppliersCount);
  const filters = useSelector(selectSuppliersFilters, shallowEqual);

  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);

  const refetch = useCallback(() => dispatch(fetchSuppliers(filters)), [dispatch, filters]);
  useEffect(() => { refetch(); }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = useCallback(() => { setEditId(null); setShowForm(true); }, []);
  const openEdit   = useCallback((id) => { setEditId(id); setShowForm(true); }, []);
  const closeForm  = useCallback(() => { setShowForm(false); setEditId(null); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 text-sm">{count} suppliers</p>
        </div>
        {hasRole('SuperAdmin', 'StoreAdmin') && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> Add Supplier
          </button>
        )}
      </div>
      <SupplierFilters onSearch={refetch} />
      {showForm && <SupplierForm editId={editId} onClose={closeForm} />}
      <SupplierTable onEdit={openEdit} />
    </div>
  );
}
