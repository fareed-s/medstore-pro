import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { HiOutlineLocationMarker, HiOutlineCube, HiOutlinePencil } from 'react-icons/hi';

export default function RackLocationsPage() {
  const { hasRole } = useAuth();
  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRack, setSelectedRack] = useState(null);
  const [rackMedicines, setRackMedicines] = useState([]);
  const [loadingMeds, setLoadingMeds] = useState(false);

  useEffect(() => { fetchRacks(); }, []);

  const fetchRacks = async () => {
    try { const { data } = await API.get('/inventory-v2/racks'); setRacks(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const loadRackMedicines = async (rack) => {
    setSelectedRack(rack);
    setLoadingMeds(true);
    try {
      const { data } = await API.get(`/inventory-v2/racks/${encodeURIComponent(rack)}`);
      setRackMedicines(data.data);
    } catch(err) { console.error(err); } finally { setLoadingMeds(false); }
  };

  const updateRack = async (medicineId, newRack) => {
    try {
      await API.put('/inventory-v2/rack-location', { medicineId, rackLocation: newRack });
      toast.success('Rack location updated');
      if (selectedRack) loadRackMedicines(selectedRack);
      fetchRacks();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const totalProducts = racks.reduce((s, r) => s + r.productCount, 0);
  const totalStock = racks.reduce((s, r) => s + r.totalStock, 0);

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Rack & Shelf Locations</h1>
      <p className="text-gray-500 text-sm mb-6">{racks.length} locations • {totalProducts} products • {totalStock.toLocaleString()} total units</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rack List */}
        <div className="lg:col-span-1">
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-heading font-semibold text-gray-900 text-sm">All Locations</h3>
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
            ) : racks.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">No rack locations assigned</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                {racks.map(r => (
                  <button key={r._id} onClick={() => loadRackMedicines(r._id)}
                    className={`w-full px-4 py-3 text-left hover:bg-primary-50/50 transition-colors ${selectedRack === r._id ? 'bg-primary-50 border-l-3 border-primary-500' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
                        <HiOutlineLocationMarker className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{r._id}</p>
                        <p className="text-xs text-gray-400">{r.productCount} products • {r.totalStock} units</p>
                      </div>
                      {r.outOfStock > 0 && (
                        <span className="badge badge-red text-[10px]">{r.outOfStock} OOS</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rack Detail */}
        <div className="lg:col-span-2">
          {selectedRack ? (
            <div className="card overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-gray-900">{selectedRack}</h3>
                  <p className="text-xs text-gray-400">{rackMedicines.length} products</p>
                </div>
              </div>
              {loadingMeds ? (
                <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white"><tr className="table-header">
                      <th className="px-4 py-2">Medicine</th><th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2 text-right">Stock</th><th className="px-4 py-2">Location</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {rackMedicines.map(m => (
                        <tr key={m._id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2">
                            <Link to={`/medicines/${m._id}`} className="font-medium text-xs text-gray-900 hover:text-primary-600">{m.medicineName}</Link>
                            <p className="text-[10px] text-gray-400">{m.genericName}</p>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500">{m.category}</td>
                          <td className="px-4 py-2 text-right">
                            <span className={`font-semibold ${m.currentStock === 0 ? 'text-red-600' : m.currentStock <= m.lowStockThreshold ? 'text-amber-600' : 'text-gray-900'}`}>
                              {m.currentStock}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {hasRole('SuperAdmin', 'StoreAdmin', 'InventoryStaff') ? (
                              <input className="input-field text-xs py-1 w-32" value={m.rackLocation || ''}
                                onBlur={(e) => { if (e.target.value !== m.rackLocation) updateRack(m._id, e.target.value); }}
                                onChange={(e) => {
                                  // Local update
                                  setRackMedicines(meds => meds.map(med => med._id === m._id ? { ...med, rackLocation: e.target.value } : med));
                                }}
                              />
                            ) : (
                              <span className="text-xs text-gray-500">{m.rackLocation}</span>
                            )}
                          </td>
                        </tr>
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
