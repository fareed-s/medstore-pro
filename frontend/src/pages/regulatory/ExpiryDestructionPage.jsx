import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';

const METHODS = [
  { value: 'incineration', label: 'Incineration' },
  { value: 'chemical_treatment', label: 'Chemical Treatment' },
  { value: 'landfill', label: 'Landfill Disposal' },
  { value: 'return_to_manufacturer', label: 'Return to Manufacturer' },
  { value: 'other', label: 'Other' },
];

export default function ExpiryDestructionPage() {
  const [destructions, setDestructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchR, setSearchR] = useState([]);
  const [form, setForm] = useState({ destructionMethod: 'incineration', destructionLocation: '', witness1Name: '', witness1Designation: '', witness2Name: '', witness2Designation: '', notes: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const { data } = await API.get('/regulatory/destructions'); setDestructions(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (searchQ.length < 2) { setSearchR([]); return; }
    const t = setTimeout(async () => {
      try {
        // Search for expired batches
        const { data } = await API.get(`/medicines/expiring?days=0`);
        // Filter results by search
        const filtered = data.data.filter(b => b.medicineId?.medicineName?.toLowerCase().includes(searchQ.toLowerCase()));
        setSearchR(filtered.slice(0, 10));
      } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const addItem = (batch) => {
    if (items.find(i => i.batchId === batch._id)) return;
    setItems([...items, {
      medicineId: batch.medicineId?._id, medicineName: batch.medicineId?.medicineName,
      batchId: batch._id, batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate, quantity: batch.remainingQty,
    }]);
    setSearchQ(''); setSearchR([]);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updateQty = (idx, qty) => setItems(items.map((item, i) => i === idx ? { ...item, quantity: parseInt(qty) || 0 } : item));

  const handleSubmit = async () => {
    if (items.length === 0) return toast.error('Add items');
    if (!form.witness1Name) return toast.error('Witness required');
    try {
      await API.post('/regulatory/destructions', { ...form, items });
      toast.success('Destruction record created. Stock updated.');
      setShowForm(false); setItems([]);
      setForm({ destructionMethod: 'incineration', destructionLocation: '', witness1Name: '', witness1Designation: '', witness2Name: '', witness2Designation: '', notes: '' });
      fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const totalValue = items.reduce((s, i) => s + (i.quantity * (i.costPrice || 0)), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Expiry Destruction Register</h1><p className="text-gray-500 text-sm">Record destruction of expired medicines</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><HiOutlinePlus className="w-4 h-4" /> New Destruction</button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card mb-6 border-2 border-red-100">
          <h3 className="font-heading font-semibold text-red-800 mb-3">Record Destruction</h3>

          {/* Search expired */}
          <div className="relative mb-3">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search expired medicines..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
            {searchR.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border max-h-48 overflow-y-auto">
                {searchR.map(b => (
                  <button key={b._id} onClick={() => addItem(b)} className="w-full px-3 py-2 text-left hover:bg-red-50 text-sm border-b">
                    {b.medicineId?.medicineName} — Batch: {b.batchNumber} — Exp: {formatDate(b.expiryDate)} — Qty: {b.remainingQty}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead><tr className="table-header text-[10px]">
                  <th className="px-3 py-1">Medicine</th><th className="px-3 py-1">Batch</th><th className="px-3 py-1">Expiry</th><th className="px-3 py-1 w-20">Qty</th><th className="px-3 py-1 w-8"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-1.5 font-medium text-xs">{item.medicineName}</td>
                      <td className="px-3 py-1.5 font-mono text-xs">{item.batchNumber}</td>
                      <td className="px-3 py-1.5 text-xs text-red-600">{formatDate(item.expiryDate)}</td>
                      <td className="px-3 py-1.5"><input type="number" min="1" className="input-field text-xs py-1 w-16" value={item.quantity} onChange={(e) => updateQty(idx, e.target.value)} /></td>
                      <td className="px-3 py-1.5"><button onClick={() => removeItem(idx)} className="p-1 hover:bg-red-50 rounded"><HiOutlineTrash className="w-3 h-3 text-red-400" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm text-right mt-2 font-medium">{items.length} items, {items.reduce((s, i) => s + i.quantity, 0)} units</p>
            </div>
          )}

          {/* Destruction details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><label className="label">Destruction Method *</label><select className="input-field" value={form.destructionMethod} onChange={(e) => setForm({ ...form, destructionMethod: e.target.value })}>{METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
            <div><label className="label">Location</label><input className="input-field" value={form.destructionLocation} onChange={(e) => setForm({ ...form, destructionLocation: e.target.value })} /></div>
            <div><label className="label">Witness 1 Name *</label><input className="input-field" value={form.witness1Name} onChange={(e) => setForm({ ...form, witness1Name: e.target.value })} required /></div>
            <div><label className="label">Witness 1 Designation</label><input className="input-field" value={form.witness1Designation} onChange={(e) => setForm({ ...form, witness1Designation: e.target.value })} /></div>
            <div><label className="label">Witness 2 Name</label><input className="input-field" value={form.witness2Name} onChange={(e) => setForm({ ...form, witness2Name: e.target.value })} /></div>
            <div><label className="label">Notes</label><input className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="btn-danger">Record Destruction</button>
            <button onClick={() => { setShowForm(false); setItems([]); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-heading font-semibold text-gray-900">Destruction Records</h3></div>
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : destructions.length === 0 ? (
          <p className="text-center py-8 text-gray-400">No destruction records</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Destruction #</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Value</th><th className="px-4 py-3 hidden md:table-cell">Method</th>
              <th className="px-4 py-3 hidden md:table-cell">Witness</th><th className="px-4 py-3">By</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {destructions.map(d => (
                <tr key={d._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2 font-mono text-xs font-bold">{d.destructionNo}</td>
                  <td className="px-4 py-2 text-xs">{formatDate(d.date)}</td>
                  <td className="px-4 py-2">{d.totalItems}</td>
                  <td className="px-4 py-2 font-semibold">{d.totalQuantity}</td>
                  <td className="px-4 py-2 text-red-600 font-medium">{formatCurrency(d.totalValue)}</td>
                  <td className="px-4 py-2 hidden md:table-cell text-xs text-gray-500">{d.destructionMethod?.replace('_', ' ')}</td>
                  <td className="px-4 py-2 hidden md:table-cell text-xs text-gray-500">{d.witness1Name}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{d.conductedBy?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
