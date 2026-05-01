import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { HiOutlinePlus } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { fetchPrescriptions, selectPrescriptionsFilters } from './prescriptionsSlice';
import StatusTabs from './components/StatusTabs';
import PrescriptionForm from './components/PrescriptionForm';
import PrescriptionTable from './components/PrescriptionTable';

export default function PrescriptionsPage() {
  const dispatch = useDispatch();
  const { hasRole } = useAuth();
  const filters = useSelector(selectPrescriptionsFilters, shallowEqual);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    dispatch(fetchPrescriptions(filters));
  }, [dispatch, filters.status]);

  const closeForm  = useCallback(() => setShowForm(false), []);
  const toggleForm = useCallback(() => setShowForm((v) => !v), []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Prescriptions</h1>
        {hasRole('SuperAdmin', 'StoreAdmin', 'Pharmacist') && (
          <button onClick={toggleForm} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> New Prescription
          </button>
        )}
      </div>
      <StatusTabs />
      {showForm && <PrescriptionForm onClose={closeForm} />}
      <PrescriptionTable />
    </div>
  );
}
