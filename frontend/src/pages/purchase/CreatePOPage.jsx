import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';

export default function CreatePOPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { API.get('/purchase/suppliers').then(r => setSuppliers(r.data.data)).catch(() => {}); }, []);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      API.get(`/medicines/search?q=${encodeURIComponent(searchQuery)}&limit=8`).then(r => setSearchResults(r.data.data)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const addItem = (med) => {
    if (items.find(i => i.medicineId === med._id)) { toast.warning('Already added'); return; }
    setItems([...items, {
      medicineId: med._id, medicineName: med.medicineName, genericName: med.genericName || '',
      quantity: med.reorderQuantity || 50, unitCost: med.costPrice || 0, taxRate: med.taxRate || 0, discount: 0,
    }]);
    setSearchQuery(''); setSearchResults([]);
  };

  const updateItem = (idx, field, value) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: parseFloat(value) || 0 } : item));
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + (i.unitCost * i.quantity), 0);
  const taxTotal = items.reduce((s, i) => s + (i.unitCost * i.quantity * (i.taxRate / 100)), 0);
  const discountTotal = items.reduce((s, i) => s + (i.discount || 0), 0);
  const grandTotal = subtotal + taxTotal - discountTotal + shippingCost;

  const handleSubmit = async () => {
    if (!supplierId) return toast.error('Select a supplier');
    if (items.length === 0) return toast.error('Add items');
    setSaving(true);
    try {
      const { data } = await API.post('/purchase/orders', { supplierId, items, expectedDelivery, shippingCost, notes });
      toast.success(`PO ${data.data.poNumber} created`);
      navigate('/purchase/orders');
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-6">Create Purchase Order</h1>

      {/* Supplier */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Supplier *</label>
            <select className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier...</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.supplierName} ({s.companyName})</option>)}
            </select>
          </div>
          <div><label className="label">Expected Delivery</label><input type="date" className="input-field" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} /></div>
          <div><label className="label">Shipping Cost</label><input type="number" step="0.01" className="input-field" value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} /></div>
        </div>
      </div>

      {/* Add Items */}
      <div className="card mb-4">
        <div className="relative mb-3">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search medicine to add..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchResults.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border max-h-60 overflow-y-auto">
              {searchResults.map(m => (
                <button key={m._id} onClick={() => addItem(m)} className="w-full px-4 py-2 flex items-center justify-between hover:bg-primary-50 text-left border-b border-gray-50 text-sm">
                  <div><p className="font-medium">{m.medicineName}</p><p className="text-xs text-gray-400">{m.genericName} • Stock: {m.currentStock}</p></div>
                  <span className="text-primary-600 font-medium">{formatCurrency(m.salePrice)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-3 py-2">Medicine</th><th className="px-3 py-2 w-24">Qty</th><th className="px-3 py-2 w-28">Unit Cost</th>
                <th className="px-3 py-2 w-20">Tax %</th><th className="px-3 py-2 w-24">Disc</th><th className="px-3 py-2 w-28 text-right">Total</th><th className="px-3 py-2 w-8"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => {
                  const lineTotal = (item.unitCost * item.quantity) + (item.unitCost * item.quantity * item.taxRate / 100) - item.discount;
                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2"><p className="font-medium text-xs">{item.medicineName}</p><p className="text-[10px] text-gray-400">{item.genericName}</p></td>
                      <td className="px-3 py-2"><input type="number" min="1" className="input-field text-sm py-1 w-20" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" step="0.01" className="input-field text-sm py-1 w-24" value={item.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" className="input-field text-sm py-1 w-16" value={item.taxRate} onChange={(e) => updateItem(idx, 'taxRate', e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" className="input-field text-sm py-1 w-20" value={item.discount} onChange={(e) => updateItem(idx, 'discount', e.target.value)} /></td>
                      <td className="px-3 py-2 text-right font-bold">{formatCurrency(lineTotal)}</td>
                      <td className="px-3 py-2"><button onClick={() => removeItem(idx)} className="p-1 hover:bg-red-50 rounded"><HiOutlineTrash className="w-4 h-4 text-red-400" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals & Submit */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1"><label className="label">Notes</label><textarea className="input-field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="space-y-1 text-sm text-right min-w-[200px]">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatCurrency(taxTotal)}</span></div>
            {discountTotal > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-{formatCurrency(discountTotal)}</span></div>}
            {shippingCost > 0 && <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatCurrency(shippingCost)}</span></div>}
            <div className="flex justify-between text-lg font-heading font-bold border-t pt-1"><span>Total</span><span className="text-primary-700">{formatCurrency(grandTotal)}</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => navigate('/purchase/orders')} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary px-8">{saving ? 'Creating...' : 'Create Purchase Order'}</button>
        </div>
      </div>
    </div>
  );
}
