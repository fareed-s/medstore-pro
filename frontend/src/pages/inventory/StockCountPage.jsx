import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { confirm } from '../../utils/swal';
import { HiOutlinePlus, HiOutlineCheck, HiOutlineClipboardCheck, HiOutlineEye } from 'react-icons/hi';

export default function StockCountPage() {
  const { hasRole } = useAuth();
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ category: '', rackLocation: '' });
  const [activeCount, setActiveCount] = useState(null);
  const [countItems, setCountItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCounts(); }, []);

  const fetchCounts = async () => {
    try { const { data } = await API.get('/inventory-v2/counts'); setCounts(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const startCount = async () => {
    try {
      const { data } = await API.post('/inventory-v2/counts', createForm);
      toast.success(`Stock count ${data.data.countNo} started with ${data.data.totalItems} items`);
      setActiveCount(data.data);
      setCountItems(data.data.items.map(i => ({ ...i, physicalQty: i.systemQty })));
      setShowCreate(false);
      fetchCounts();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const loadCount = async (id) => {
    try {
      const { data } = await API.get(`/inventory-v2/counts/${id}`);
      setActiveCount(data.data);
      setCountItems(data.data.items);
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const updatePhysicalQty = (idx, qty) => {
    setCountItems(items => items.map((item, i) => {
      if (i === idx) {
        const physicalQty = parseInt(qty) || 0;
        return { ...item, physicalQty, variance: physicalQty - item.systemQty };
      }
      return item;
    }));
  };

  const saveCount = async () => {
    if (!activeCount) return;
    setSaving(true);
    try {
      await API.put(`/inventory-v2/counts/${activeCount._id}`, {
        items: countItems.map(i => ({
          medicineId: i.medicineId._id || i.medicineId,
          physicalQty: i.physicalQty,
          reason: i.reason || '',
        })),
      });
      toast.success('Count saved');
      fetchCounts();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } finally { setSaving(false); }
  };

  const approveCount = async (id) => {
    if (!(await confirm(
      'Stock will be adjusted for all variances in this count.',
      { title: 'Approve stock count?', confirmText: 'Approve' }
    ))) return;
    try {
      await API.post(`/inventory-v2/counts/${id}/approve`);
      toast.success('Stock count approved — adjustments applied');
      setActiveCount(null);
      setCountItems([]);
      fetchCounts();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const statusBadge = { in_progress: 'badge-amber', completed: 'badge-blue', approved: 'badge-green', rejected: 'badge-red' };
  const varianceItems = countItems.filter(i => i.variance !== 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Physical Stock Count</h1>
          <p className="text-gray-500 text-sm">Reconcile system stock with physical count</p>
        </div>
        {hasRole('SuperAdmin', 'StoreAdmin', 'InventoryStaff') && (
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> New Count
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card mb-6">
          <h3 className="font-heading font-semibold text-gray-900 mb-3">Start New Stock Count</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="label">Category (optional)</label>
              <select className="input-field" value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}>
                <option value="">All Categories</option>
                {['Tablet','Capsule','Syrup','Injection','Cream/Ointment','Drops','Inhaler'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Rack Location (optional)</label>
              <input className="input-field" placeholder="e.g. Shelf A" value={createForm.rackLocation} onChange={(e) => setCreateForm({ ...createForm, rackLocation: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={startCount} className="btn-primary">Start Count</button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Active Count */}
      {activeCount && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-gray-900">
                Count: {activeCount.countNo}
                <span className={`badge ${statusBadge[activeCount.status]} ml-2`}>{activeCount.status}</span>
              </h3>
              <p className="text-xs text-gray-400">{countItems.length} items • {varianceItems.length} variances</p>
            </div>
            <div className="flex gap-2">
              {activeCount.status === 'in_progress' && (
                <>
                  <button onClick={saveCount} disabled={saving} className="btn-secondary text-sm">{saving ? 'Saving...' : 'Save Progress'}</button>
                  <button onClick={() => approveCount(activeCount._id)} className="btn-primary text-sm flex items-center gap-1">
                    <HiOutlineCheck className="w-4 h-4" /> Approve & Apply
                  </button>
                </>
              )}
              <button onClick={() => { setActiveCount(null); setCountItems([]); }} className="btn-ghost text-sm">Close</button>
            </div>
          </div>

          {/* Variance summary */}
          {varianceItems.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 font-medium">Total Variances</p>
                <p className="text-xl font-heading font-bold text-amber-700">{varianceItems.length}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-green-600 font-medium">Found Extra</p>
                <p className="text-xl font-heading font-bold text-green-700">+{countItems.filter(i => i.variance > 0).reduce((s, i) => s + i.variance, 0)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-red-600 font-medium">Missing</p>
                <p className="text-xl font-heading font-bold text-red-700">{countItems.filter(i => i.variance < 0).reduce((s, i) => s + i.variance, 0)}</p>
              </div>
            </div>
          )}

          {/* Count items table */}
          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="table-header">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Medicine</th>
                  <th className="px-3 py-2 text-center">System Qty</th>
                  <th className="px-3 py-2 text-center">Physical Qty</th>
                  <th className="px-3 py-2 text-center">Variance</th>
                  <th className="px-3 py-2 hidden md:table-cell">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {countItems.map((item, idx) => (
                  <tr key={idx} className={`${item.variance !== 0 ? 'bg-amber-50/30' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-xs">{item.medicineName}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{item.systemQty}</td>
                    <td className="px-3 py-2 text-center">
                      {activeCount.status === 'in_progress' ? (
                        <input type="number" min="0" value={item.physicalQty}
                          onChange={(e) => updatePhysicalQty(idx, e.target.value)}
                          className="w-20 text-center border border-gray-200 rounded-lg py-1 text-sm font-semibold" />
                      ) : (
                        <span className="font-semibold">{item.physicalQty}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.variance !== 0 ? (
                        <span className={`font-bold ${item.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.variance > 0 ? '+' : ''}{item.variance}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      {item.variance !== 0 && activeCount.status === 'in_progress' && (
                        <input className="input-field text-xs py-1" placeholder="Reason" value={item.reason || ''}
                          onChange={(e) => {
                            setCountItems(items => items.map((it, i) => i === idx ? { ...it, reason: e.target.value } : it));
                          }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Previous Counts */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-semibold text-gray-900">Count History</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : counts.length === 0 ? (
          <p className="text-center py-8 text-gray-400">No stock counts yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Count #</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Variances</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">By</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {counts.map(c => (
                <tr key={c._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs font-bold">{c.countNo}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(c.createdAt)}</td>
                  <td className="px-4 py-3">{c.totalItems}</td>
                  <td className="px-4 py-3">
                    {c.totalVariance > 0 ? (
                      <span className="text-amber-600 font-medium">{c.totalVariance} ({formatCurrency(Math.abs(c.totalVarianceValue))})</span>
                    ) : <span className="text-gray-400">None</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${statusBadge[c.status]}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.countedBy?.name}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => loadCount(c._id)} className="p-1.5 hover:bg-gray-100 rounded-lg"><HiOutlineEye className="w-4 h-4 text-gray-500" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
