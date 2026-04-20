import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';

const REASONS = ['Expired stock', 'Damaged goods', 'Wrong product received', 'Quality issue', 'Excess supply', 'Recalled product', 'Other'];

export default function PurchaseReturnPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchR, setSearchR] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [supRes, retRes] = await Promise.all([
        API.get('/purchase/suppliers'), API.get('/purchase/returns'),
      ]);
      setSuppliers(supRes.data.data); setReturns(retRes.data.data);
    } catch(err) { console.error(err); } finally { setLoading(false); }
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
    setItems([...items, { medicineId: med._id, medicineName: med.medicineName, quantity: 1, unitCost: med.costPrice || 0, batchNumber: '', reason: '' }]);
    setSearchQ(''); setSearchR([]);
  };

  const updateItem = (idx, f, v) => setItems(items.map((i, j) => j === idx ? { ...i, [f]: f === 'quantity' || f === 'unitCost' ? parseFloat(v) || 0 : v } : i));
  const removeItem = (idx) => setItems(items.filter((_, j) => j !== idx));
  const totalAmt = items.reduce((s, i) => s + (i.unitCost * i.quantity), 0);

  const handleSubmit = async () => {
    if (!supplierId) return toast.error('Select supplier');
    if (!items.length) return toast.error('Add items');
    if (!reason) return toast.error('Select reason');
    try {
      await API.post('/purchase/returns', { supplierId, items, reason, notes });
      toast.success('Purchase return created');
      setShowForm(false); setItems([]); setSupplierId(''); setReason(''); setNotes(''); fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Purchase Returns</h1><p className="text-gray-500 text-sm">Return goods to suppliers</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><HiOutlinePlus className="w-4 h-4" /> New Return</button>
      </div>

      {showForm && (
        <div className="card mb-6 border-2 border-blue-100">
          <h3 className="font-heading font-semibold mb-3">Create Purchase Return (Debit Note)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div><label className="label">Supplier *</label><select className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Select...</option>{suppliers.map(s => <option key={s._id} value={s._id}>{s.supplierName}</option>)}</select></div>
            <div><label className="label">Reason *</label><select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Select...</option>{REASONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            <div><label className="label">Notes</label><input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <div className="relative mb-3">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search medicine to return..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
            {searchR.length > 0 && <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border max-h-40 overflow-y-auto">{searchR.map(m => <button key={m._id} onClick={() => addItem(m)} className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm border-b">{m.medicineName}</button>)}</div>}
          </div>
          {items.length > 0 && (
            <table className="w-full text-sm mb-3">
              <thead><tr className="table-header text-[10px]"><th className="px-3 py-1">Medicine</th><th className="px-3 py-1 w-20">Qty</th><th className="px-3 py-1 w-24">Cost</th><th className="px-3 py-1 w-28">Batch</th><th className="px-3 py-1 w-16 text-right">Total</th><th className="w-6"></th></tr></thead>
              <tbody className="divide-y divide-gray-50">{items.map((item, idx) => (
                <tr key={idx}><td className="px-3 py-1 text-xs font-medium">{item.medicineName}</td>
                  <td className="px-3 py-1"><input type="number" min="1" className="input-field text-xs py-1 w-16" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} /></td>
                  <td className="px-3 py-1"><input type="number" step="0.01" className="input-field text-xs py-1 w-20" value={item.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)} /></td>
                  <td className="px-3 py-1"><input className="input-field text-xs py-1" placeholder="Batch#" value={item.batchNumber} onChange={(e) => updateItem(idx, 'batchNumber', e.target.value)} /></td>
                  <td className="px-3 py-1 text-right font-bold">{formatCurrency(item.unitCost * item.quantity)}</td>
                  <td><button onClick={() => removeItem(idx)} className="p-0.5 hover:bg-red-50 rounded"><HiOutlineTrash className="w-3 h-3 text-red-400" /></button></td>
                </tr>))}</tbody>
            </table>
          )}
          <div className="flex items-center justify-between">
            <span className="font-bold">Total: {formatCurrency(totalAmt)}</span>
            <div className="flex gap-2"><button onClick={handleSubmit} className="btn-primary">Create Return</button><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : returns.length === 0 ? <p className="text-center py-8 text-gray-400">No purchase returns</p> : (
          <table className="w-full text-sm">
            <thead><tr className="table-header"><th className="px-4 py-3">Return #</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Items</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Date</th></tr></thead>
            <tbody className="divide-y divide-gray-50">{returns.map(r => (
              <tr key={r._id} className="hover:bg-gray-50/50"><td className="px-4 py-2 font-mono text-xs font-bold">{r.returnNo}</td><td className="px-4 py-2">{r.supplierName}</td><td className="px-4 py-2 text-xs text-gray-500">{r.reason}</td><td className="px-4 py-2">{r.items?.length}</td><td className="px-4 py-2 text-right font-bold text-red-600">{formatCurrency(r.totalAmount)}</td><td className="px-4 py-2 text-xs text-gray-400">{formatDate(r.createdAt)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
