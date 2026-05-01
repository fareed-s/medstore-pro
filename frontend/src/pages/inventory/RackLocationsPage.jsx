import { useCallback, useEffect, useState } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { HiOutlineCube } from 'react-icons/hi';
import { apiError } from '../../utils/helpers';
import Spinner from '../../shared/components/Spinner';
import RackListItem from './components/RackListItem';
import RackMedicineRow from './components/RackMedicineRow';

export default function RackLocationsPage() {
  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRack, setSelectedRack] = useState(null);
  const [rackMedicines, setRackMedicines] = useState([]);
  const [loadingMeds, setLoadingMeds] = useState(false);

  const fetchRacks = useCallback(async () => {
    try { const { data } = await API.get('/inventory-v2/racks'); setRacks(data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const loadRackMedicines = useCallback(async (rack) => {
    setSelectedRack(rack);
    setLoadingMeds(true);
    try {
      const { data } = await API.get(`/inventory-v2/racks/${encodeURIComponent(rack)}`);
      setRackMedicines(data.data);
    } catch (err) { console.error(err); }
    finally { setLoadingMeds(false); }
  }, []);

  const updateRack = useCallback(async (medicineId, newRack) => {
    try {
      await API.put('/inventory-v2/rack-location', { medicineId, rackLocation: newRack });
      toast.success('Rack location updated');
      if (selectedRack) loadRackMedicines(selectedRack);
      fetchRacks();
    } catch (err) { toast.error(apiError(err)); }
  }, [selectedRack, loadRackMedicines, fetchRacks]);

  useEffect(() => { fetchRacks(); }, [fetchRacks]);

  const totalProducts = racks.reduce((s, r) => s + r.productCount, 0);
  const totalStock    = racks.reduce((s, r) => s + r.totalStock,    0);

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Rack & Shelf Locations</h1>
      <p className="text-gray-500 text-sm mb-6">
        {racks.length} locations • {totalProducts} products • {totalStock.toLocaleString()} total units
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-heading font-semibold text-gray-900 text-sm">All Locations</h3>
            </div>
            {loading ? <Spinner size="sm" padding="sm" />
              : racks.length === 0
                ? <p className="text-center py-8 text-gray-400 text-sm">No rack locations assigned</p>
                : (
                  <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                    {racks.map((r) => (
                      <RackListItem key={r._id} rack={r} active={selectedRack === r._id} onSelect={loadRackMedicines} />
                    ))}
                  </div>
                )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedRack ? (
            <div className="card overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-gray-900">{selectedRack}</h3>
                  <p className="text-xs text-gray-400">{rackMedicines.length} products</p>
                </div>
              </div>
              {loadingMeds ? <Spinner size="sm" />
                : (
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="table-header">
                          <th className="px-4 py-2">Medicine</th>
                          <th className="px-4 py-2">Category</th>
                          <th className="px-4 py-2 text-right">Stock</th>
                          <th className="px-4 py-2">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rackMedicines.map((m) => (
                          <RackMedicineRow key={m._id} medicine={m} onSaveLocation={updateRack} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 text-gray-300">
              <HiOutlineCube className="w-16 h-16 mb-3 opacity-30" />
              <p className="font-heading font-medium text-lg">Select a rack location</p>
              <p className="text-sm">Click on a location to see its medicines</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
