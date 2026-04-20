import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineTrash, HiOutlineCheck, HiOutlineX, HiOutlineSwitchHorizontal } from 'react-icons/hi';

export default function StockTransferPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([]);
  const [toStore, setToStore] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchR, setSearchR] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const { data } = await API.get('/transfers'); setTransfers(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (searchQ.length < 2) { setSearchR([]); return; }
    const t = setTimeout(async () => {
      try { const { data } = await API.get(`/medicines/search?q=${searchQ}&limit=8`); setSearchR(data.data); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
    }, 200);
    return () => clearTimeout(t);
  }, [searchQ]);

  const addItem = (med) => {
    if (items.find(i => i.medicineId === med._id)) return;
    setItems([...items, { medicineId: med._id, medicineName: med.medicineName, quantity: 1, stock: med.currentStock }]);
    setSearchQ(''); setSearchR([]);
  };

  const updateQty = (idx, q) => setItems(items.map((i, j) => j === idx ? { ...i, quantity: parseInt(q) || 1 } : i));
  const removeItem = (idx) => setItems(items.filter((_, j) => j !== idx));

  const handleSubmit = async () => {
    if (!items.length) return toast.error('Add items');
    try {
      await API.post('/transfers', { toStore: toStore || undefined, items, notes });
      toast.success('Transfer request created');
      setShowForm(false); setItems([]); setToStore(''); setNotes(''); fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const approve = async (id) => { try { await API.post(`/transfers/${id}/approve`); toast.success('Approved'); fetchData(); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } };
  const complete = async (id) => { try { await API.post(`/transfers/${id}/complete`); toast.success('Completed — stock deducted'); fetchData(); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } };
  const reject = async (id) => { const r = prompt('Rejection reason:'); if (!r) return; try { await API.post(`/transfers/${id}/reject`, { reason: r }); fetchData(); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } };

  const sBadge = { pending: 'badge-amber', approved: 'badge-blue', completed: 'badge-green', rejected: 'badge-red' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Stock Transfers</h1><p className="text-gray-500 text-sm">Branch-to-branch inventory transfer</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><HiOutlinePlus className="w-4 h-4" /> New Transfer</button>
      </div>

      {showForm && (
        <div className="card mb-6 border-2 border-blue-100">
          <h3 className="font-heading font-semibold mb-3">Create Transfer Request</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="label">To Branch (Store ID or Name)</label><input className="input-field" placeholder="Leave empty for HQ" value={toStore} onChange={(e) => setToStore(e.target.value)} /></div>
            <div><label className="label">Notes</label><input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <div className="relative mb-3">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search medicine..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
            {searchR.length > 0 && <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border max-h-40 overflow-y-auto">{searchR.map(m => <button key={m._id} onClick={() => addItem(m)} className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm border-b">{m.medicineName} — Stock: {m.currentStock}</button>)}</div>}
          </div>
          {items.length > 0 && (
            <table className="w-full text-sm mb-3"><thead><tr className="table-header text-[10px]"><th className="px-3 py-1">Medicine</th><th className="px-3 py-1 w-20">Stock</th><th className="px-3 py-1 w-20">Transfer Qty</th><th className="w-6"></th></tr></thead>
              <tbody className="divide-y divide-gray-50">{items.map((item, idx) => (
                <tr key={idx}><td className="px-3 py-1 text-xs font-medium">{item.medicineName}</td><td className="px-3 py-1 text-xs text-gray-500 text-center">{item.stock}</td>
                  <td className="px-3 py-1"><input type="number" min="1" max={item.stock} className="input-field text-xs py-1 w-16" value={item.quantity} onChange={(e) => updateQty(idx, e.target.value)} /></td>
                  <td><button onClick={() => removeItem(idx)} className="p-0.5 hover:bg-red-50 rounded"><HiOutlineTrash className="w-3 h-3 text-red-400" /></button></td>
                </tr>))}</tbody>
            </table>
          )}
          <div className="flex gap-2"><button onClick={handleSubmit} className="btn-primary">Create Transfer</button><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : transfers.length === 0 ? <p className="text-center py-8 text-gray-400">No transfers</p> : (
          <table className="w-full text-sm">
            <thead><tr className="table-header"><th className="px-4 py-3">Transfer #</th><th className="px-4 py-3">From</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-50">{transfers.map(t => (
              <tr key={t._id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2 font-mono text-xs font-bold">{t.transferNo}</td>
                <td className="px-4 py-2 text-xs">{t.fromStore?.storeName || '—'}</td>
                <td className="px-4 py-2 text-xs">{t.toStore?.storeName || '—'}</td>
                <td className="px-4 py-2">{t.totalItems} items ({t.totalQuantity} units)</td>
                <td className="px-4 py-2"><span className={`badge ${sBadge[t.status]} text-[10px]`}>{t.status}</span></td>
                <td className="px-4 py-2 text-xs text-gray-400">{formatDate(t.createdAt)}</td>
                <td className="px-4 py-2 flex gap-1">
                  {t.status === 'pending' && <><button onClick={() => approve(t._id)} className="p-1 hover:bg-green-50 rounded" title="Approve"><HiOutlineCheck className="w-4 h-4 text-green-500" /></button><button onClick={() => reject(t._id)} className="p-1 hover:bg-red-50 rounded" title="Reject"><HiOutlineX className="w-4 h-4 text-red-500" /></button></>}
                  {t.status === 'approved' && <button onClick={() => complete(t._id)} className="p-1 hover:bg-blue-50 rounded text-[10px] text-blue-600 font-medium" title="Complete">Complete</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
