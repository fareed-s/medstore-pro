import { useCallback, useEffect, useState } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { HiOutlinePlus } from 'react-icons/hi';
import Spinner from '../../shared/components/Spinner';
import DrugLicenseRow from './components/DrugLicenseRow';
import DrugLicenseForm from './components/DrugLicenseForm';

export default function DrugLicensesPage() {
  const { hasRole } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [licRes, alertRes] = await Promise.all([
        API.get('/regulatory/licenses'),
        API.get('/regulatory/licenses/alerts'),
      ]);
      setLicenses(licRes.data.data);
      setAlerts(alertRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const closeForm = useCallback(() => setShowForm(false), []);
  const toggleForm = useCallback(() => setShowForm((v) => !v), []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Drug Licenses</h1>
          <p className="text-gray-500 text-sm">Track all drug license expiry dates</p>
        </div>
        {hasRole('SuperAdmin', 'StoreAdmin') && (
          <button onClick={toggleForm} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> Add License
          </button>
        )}
      </div>

      {alerts && alerts.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <AlertTile color="border-red-500"   label="Expired"     count={alerts.expired?.length || 0} valueColor="text-red-700" />
          <AlertTile color="border-red-400"   label="0-30 Days"   count={alerts.within30?.length || 0} />
          <AlertTile color="border-amber-400" label="31-60 Days"  count={alerts.within60?.length || 0} />
          <AlertTile color="border-green-400" label="61-90 Days"  count={alerts.within90?.length || 0} />
        </div>
      )}

      {showForm && <DrugLicenseForm onSaved={fetchData} onClose={closeForm} />}

      <div className="card overflow-hidden p-0">
        {loading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">License #</th>
                <th className="px-4 py-3">Issued To</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {licenses.map((dl) => <DrugLicenseRow key={dl._id} license={dl} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AlertTile({ color, label, count, valueColor }) {
  return (
    <div className={`card py-3 border-l-4 ${color}`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-xl font-heading font-bold ${valueColor || ''}`}>{count}</p>
    </div>
  );
}
