import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getExpiryStatus, getScheduleBadge, getStockStatus } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { confirmDanger } from '../../utils/swal';
import { HiOutlinePencil, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';

export default function MedicineDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [med, setMed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchForm, setBatchForm] = useState({ batchNumber: '', expiryDate: '', quantity: 0, costPrice: 0, salePrice: 0, mrp: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchMedicine(); }, [id]);

  const fetchMedicine = async () => {
    try {
      const { data } = await API.get(`/medicines/${id}`);
      setMed(data.data);
      setBatchForm(f => ({ ...f, costPrice: data.data.costPrice, salePrice: data.data.salePrice, mrp: data.data.mrp }));
    } catch { navigate('/medicines'); } finally { setLoading(false); }
  };

  const addBatch = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post('/batches', { medicineId: id, ...batchForm, quantity: parseInt(batchForm.quantity) });
      toast.success('Batch added, stock updated');
      setBatchForm({ batchNumber: '', expiryDate: '', quantity: 0, costPrice: med.costPrice, salePrice: med.salePrice, mrp: med.mrp });
      setShowBatchForm(false);
      fetchMedicine();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } finally { setSaving(false); }
  };

  const deleteMedicine = async () => {
    if (!(await confirmDanger('This medicine will be removed from your inventory.', { title: 'Delete medicine?', confirmText: 'Delete' }))) return;
    try {
      await API.delete(`/medicines/${id}`);
      toast.success('Medicine deleted');
      navigate('/medicines');
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  if (!med) return <div className="text-center py-20 text-gray-400">Medicine not found</div>;

  const sch = getScheduleBadge(med.schedule);
  const stock = getStockStatus(med.currentStock, med.lowStockThreshold);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-heading font-bold text-gray-900">{med.medicineName}</h1>
            <span className={`badge ${sch.bg} ${sch.text}`}>{med.schedule}</span>
          </div>
          <p className="text-gray-500">{med.genericName} {med.manufacturer && `• ${med.manufacturer}`}</p>
          <p className="text-xs text-gray-400 font-mono mt-1">Barcode: {med.barcode} | SKU: {med.sku}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {hasRole('SuperAdmin', 'StoreAdmin', 'Pharmacist') && (
            <Link to={`/medicines/${id}/edit`} className="btn-secondary flex items-center gap-1.5"><HiOutlinePencil className="w-4 h-4" /> Edit</Link>
          )}
          {hasRole('SuperAdmin', 'StoreAdmin') && (
            <button onClick={deleteMedicine} className="btn-danger flex items-center gap-1.5"><HiOutlineTrash className="w-4 h-4" /> Delete</button>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-1">Current Stock</p>
          <p className={`text-3xl font-heading font-bold ${stock.color === 'red' ? 'text-red-600' : stock.color === 'amber' ? 'text-amber-600' : 'text-primary-600'}`}>{med.currentStock}</p>
          <span className={`badge badge-${stock.color} mt-2`}>{stock.label}</span>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-1">Sale Price</p>
          <p className="text-3xl font-heading font-bold text-gray-900">{formatCurrency(med.salePrice)}</p>
          <p className="text-xs text-gray-400 mt-1">MRP: {formatCurrency(med.mrp)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-1">Margin</p>
          <p className="text-3xl font-heading font-bold text-primary-600">{med.marginPercent?.toFixed(1) || 0}%</p>
          <p className="text-xs text-gray-400 mt-1">Cost: {formatCurrency(med.costPrice)}</p>
        </div>
      </div>

      {/* Details */}
      <div className="card mb-6">
        <h3 className="font-heading font-semibold text-gray-900 mb-4">Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 text-sm">
          {[
            ['Category', med.category], ['Sub Category', med.subCategory],
            ['Therapeutic Class', med.therapeuticClass], ['Dosage Form', med.dosageForm],
            ['Formulation', med.formulation], ['Strength', med.strength],
            ['Pack Size', med.packSize], ['Units/Pack', med.unitsPerPack],
            ['Storage', med.storageCondition], ['Rack Location', med.rackLocation || '—'],
            ['Tax Rate', `${med.taxRate}%`], ['Reorder Level', med.reorderLevel],
            ['Prescription Required', med.requiresPrescription ? 'Yes' : 'No'],
            ['Controlled Drug', med.isControlled ? 'Yes' : 'No'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-gray-400 text-xs">{label}</p>
              <p className="text-gray-800 font-medium">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Batches */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-gray-900">Stock Batches ({med.batches?.length || 0})</h3>
          {hasRole('SuperAdmin', 'StoreAdmin', 'InventoryStaff') && (
            <button onClick={() => setShowBatchForm(!showBatchForm)} className="btn-primary text-sm flex items-center gap-1.5">
              <HiOutlinePlus className="w-4 h-4" /> Add Batch
            </button>
          )}
        </div>

        {showBatchForm && (
          <form onSubmit={addBatch} className="bg-emerald-50/50 rounded-xl p-4 mb-4 border border-emerald-100">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="label">Batch Number *</label><input className="input-field" value={batchForm.batchNumber} onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })} required /></div>
              <div><label className="label">Expiry Date *</label><input type="date" className="input-field" value={batchForm.expiryDate} onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })} required /></div>
              <div><label className="label">Quantity *</label><input type="number" min="1" className="input-field" value={batchForm.quantity} onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })} required /></div>
              <div><label className="label">Cost Price</label><input type="number" step="0.01" className="input-field" value={batchForm.costPrice} onChange={(e) => setBatchForm({ ...batchForm, costPrice: parseFloat(e.target.value) })} /></div>
              <div><label className="label">Sale Price</label><input type="number" step="0.01" className="input-field" value={batchForm.salePrice} onChange={(e) => setBatchForm({ ...batchForm, salePrice: parseFloat(e.target.value) })} /></div>
              <div><label className="label">MRP</label><input type="number" step="0.01" className="input-field" value={batchForm.mrp} onChange={(e) => setBatchForm({ ...batchForm, mrp: parseFloat(e.target.value) })} /></div>
            </div>
            <div className="flex gap-2 mt-3"><button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Adding...' : 'Add Batch'}</button><button type="button" onClick={() => setShowBatchForm(false)} className="btn-secondary text-sm">Cancel</button></div>
          </form>
        )}

        {med.batches?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-2">Batch #</th><th className="px-4 py-2">Expiry</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Remaining</th><th className="px-4 py-2">Original</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {med.batches.map((b) => {
                  const exp = getExpiryStatus(b.expiryDate);
                  return (
                    <tr key={b._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 font-mono text-xs">{b.batchNumber}</td>
                      <td className="px-4 py-2">{formatDate(b.expiryDate)}</td>
                      <td className="px-4 py-2"><span className={`badge badge-${exp.color}`}>{exp.label}</span></td>
                      <td className="px-4 py-2 font-semibold">{b.remainingQty}</td>
                      <td className="px-4 py-2 text-gray-400">{b.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No batches yet. Add stock to get started.</p>
        )}
      </div>
    </div>
  );
}
