import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getExpiryStatus, getScheduleBadge, getStockStatus } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { confirmDanger } from '../../utils/swal';
import { HiOutlinePencil, HiOutlineTrash, HiOutlinePlus, HiOutlinePencilAlt, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';

export default function MedicineDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [med, setMed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchForm, setBatchForm] = useState({ batchNumber: '', expiryDate: '', quantity: 0, costPrice: 0, salePrice: 0, mrp: 0 });
  const [saving, setSaving] = useState(false);

  // Inline-edit row state. Holds the id of the batch currently being edited
  // (null = not editing) and a working copy of its fields. Starting from a
  // fresh copy each time prevents stale data leaking between rows.
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Inline edit for the "Current Stock" cell in the Details grid.
  const [editingStock, setEditingStock] = useState(false);
  const [stockDraft, setStockDraft] = useState(0);
  const [savingStock, setSavingStock] = useState(false);

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

  // Inline edit handlers ---------------------------------------------------
  const startEditBatch = (b) => {
    setEditingBatchId(b._id);
    setEditForm({
      batchNumber: b.batchNumber || '',
      expiryDate: b.expiryDate ? b.expiryDate.slice(0, 10) : '',
      remainingQty: b.remainingQty ?? 0,
      quantity: b.quantity ?? 0, // editable Original
      costPrice: b.costPrice ?? 0,
      salePrice: b.salePrice ?? 0,
      mrp: b.mrp ?? 0,
    });
  };
  const cancelEditBatch = () => { setEditingBatchId(null); setEditForm({}); };
  const saveBatchEdit = async () => {
    if (!editForm.batchNumber || !editForm.expiryDate) {
      toast.error('Batch number and expiry date are required');
      return;
    }
    const remaining = Number(editForm.remainingQty) || 0;
    const original  = Number(editForm.quantity)     || 0;
    if (remaining > original) {
      toast.warning(`Remaining (${remaining}) can't exceed original (${original}) — clamping.`);
    }
    setSavingEdit(true);
    try {
      await API.put(`/batches/${editingBatchId}`, {
        batchNumber: editForm.batchNumber,
        expiryDate: editForm.expiryDate,
        remainingQty: remaining,
        quantity: original,
        costPrice: Number(editForm.costPrice) || 0,
        salePrice: Number(editForm.salePrice) || 0,
        mrp: Number(editForm.mrp) || 0,
      });
      toast.success('Batch updated');
      cancelEditBatch();
      fetchMedicine();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };

  // Current Stock inline edit (from the Details grid). Cascades to the
  // matching batch on the server side — see backend setCurrentStock.
  const startEditStock = () => {
    setStockDraft(med.currentStock ?? 0);
    setEditingStock(true);
  };
  const cancelEditStock = () => { setEditingStock(false); };
  const saveStockEdit = async () => {
    const next = Number(stockDraft);
    if (!Number.isFinite(next) || next < 0) {
      toast.error('Enter a valid stock value');
      return;
    }
    setSavingStock(true);
    try {
      await API.put(`/medicines/${id}/stock`, { currentStock: next });
      toast.success('Current stock updated');
      setEditingStock(false);
      fetchMedicine();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSavingStock(false);
    }
  };
  const deleteBatch = async (b) => {
    if (!(await confirmDanger(
      `Batch ${b.batchNumber} (${b.remainingQty} units) will be permanently removed and stock will be recalculated.`,
      { title: 'Delete batch?', confirmText: 'Delete' }
    ))) return;
    try {
      await API.delete(`/batches/${b._id}`);
      toast.success('Batch deleted');
      fetchMedicine();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
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
          {/* Current Stock — same value as the tile above, editable inline.
              On save it cascades to the matching batch via PUT /:id/stock. */}
          <div className="md:col-span-2">
            <p className="text-gray-400 text-xs flex items-center gap-2">
              Current Stock
              {(med.batches?.length || 0) > 1 && (
                <span className="text-[10px] text-amber-600">— multiple batches, edit below</span>
              )}
            </p>
            {editingStock ? (
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="number"
                  min="0"
                  className="input-field text-sm py-1.5 w-24"
                  value={stockDraft}
                  onChange={(e) => setStockDraft(e.target.value)}
                  autoFocus
                />
                <button onClick={saveStockEdit} disabled={savingStock}
                  title="Save" className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600 disabled:opacity-50">
                  <HiOutlineCheck className="w-4 h-4" />
                </button>
                <button onClick={cancelEditStock} disabled={savingStock}
                  title="Cancel" className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                  <HiOutlineX className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-gray-800 font-bold text-base">{med.currentStock ?? 0}</p>
                {hasRole('SuperAdmin', 'StoreAdmin', 'InventoryStaff', 'Pharmacist') && (med.batches?.length || 0) <= 1 && (
                  <button onClick={startEditStock}
                    title="Edit current stock" className="p-1 rounded hover:bg-primary-50 text-primary-600">
                    <HiOutlinePencilAlt className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
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
                <th className="px-4 py-2">Batch #</th>
                <th className="px-4 py-2">Expiry</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Remaining</th>
                <th className="px-4 py-2">Original</th>
                {hasRole('SuperAdmin', 'StoreAdmin', 'InventoryStaff') && (
                  <th className="px-4 py-2 text-right">Actions</th>
                )}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {med.batches.map((b) => {
                  const exp = getExpiryStatus(b.expiryDate);
                  const isEditing = editingBatchId === b._id;
                  const canEdit = hasRole('SuperAdmin', 'StoreAdmin', 'InventoryStaff');
                  const canDelete = hasRole('SuperAdmin', 'StoreAdmin');

                  if (isEditing) {
                    return (
                      <tr key={b._id} className="bg-emerald-50/40">
                        <td className="px-4 py-2">
                          <input className="input-field text-xs py-1.5" value={editForm.batchNumber}
                            onChange={(e) => setEditForm({ ...editForm, batchNumber: e.target.value })} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="date" className="input-field text-xs py-1.5" value={editForm.expiryDate}
                            onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} />
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-400">—</td>
                        <td className="px-4 py-2">
                          <input type="number" min="0" className="input-field text-xs py-1.5 w-20" value={editForm.remainingQty}
                            onChange={(e) => setEditForm({ ...editForm, remainingQty: e.target.value })} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" min="0" className="input-field text-xs py-1.5 w-20" value={editForm.quantity}
                            onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                            title="Original received quantity — fix typos here" />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={saveBatchEdit} disabled={savingEdit}
                              title="Save" className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600 disabled:opacity-50">
                              <HiOutlineCheck className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditBatch} disabled={savingEdit}
                              title="Cancel" className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                              <HiOutlineX className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={b._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 font-mono text-xs">{b.batchNumber}</td>
                      <td className="px-4 py-2">{formatDate(b.expiryDate)}</td>
                      <td className="px-4 py-2"><span className={`badge badge-${exp.color}`}>{exp.label}</span></td>
                      <td className="px-4 py-2 font-semibold">{b.remainingQty}</td>
                      <td className="px-4 py-2 text-gray-400">{b.quantity}</td>
                      {canEdit && (
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEditBatch(b)}
                              title="Edit batch" className="p-1.5 rounded hover:bg-primary-50 text-primary-600">
                              <HiOutlinePencilAlt className="w-4 h-4" />
                            </button>
                            {canDelete && (
                              <button onClick={() => deleteBatch(b)}
                                title="Delete batch" className="p-1.5 rounded hover:bg-red-50 text-red-500">
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
            <p className="text-3xl mb-1">📦</p>
            <p className="text-gray-500 font-medium text-sm">No batches added</p>
            <p className="text-gray-400 text-xs mt-1">
              Batches are optional — set Current Stock above, or click <b>+ Add Batch</b> to track expiry and lot details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
