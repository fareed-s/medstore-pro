import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineSearch, HiOutlineClipboardCheck } from 'react-icons/hi';

export default function GRNPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('create'); // create | history
  const [suppliers, setSuppliers] = useState([]);
  const [grns, setGrns] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // GRN form
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { API.get('/purchase/suppliers').then(r => setSuppliers(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { if (tab === 'history') fetchGRNs(); }, [tab]);

  const fetchGRNs = async () => {
    setLoadingHistory(true);
    try { const { data } = await API.get('/purchase/grn'); setGrns(data.data); } catch(err) { console.error(err); } finally { setLoadingHistory(false); }
  };

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      API.get(`/medicines/search?q=${encodeURIComponent(searchQuery)}&limit=8`).then(r => setSearchResults(r.data.data)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const addItem = (med) => {
    setItems([...items, {
      medicineId: med._id, medicineName: med.medicineName,
      receivedQty: 0, freeQty: 0, damagedQty: 0,
      batchNumber: '', expiryDate: '',
      unitCost: med.costPrice || 0, mrp: med.mrp || 0, salePrice: med.salePrice || 0,
      taxRate: med.taxRate || 0,
    }]);
    setSearchQuery(''); setSearchResults([]);
  };

  const updateItem = (idx, field, value) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: field === 'batchNumber' || field === 'expiryDate' ? value : parseFloat(value) || 0 } : item));
  };
  const updateItemStr = (idx, field, value) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const totalCost = items.reduce((s, i) => s + (i.unitCost * i.receivedQty) + (i.unitCost * i.receivedQty * (i.taxRate || 0) / 100), 0);

  const handleSubmit = async () => {
    if (!supplierId) return toast.error('Select supplier');
    if (items.length === 0) return toast.error('Add items');
    for (const item of items) {
      if (!item.batchNumber) return toast.error(`Batch number required for ${item.medicineName}`);
      if (!item.expiryDate) return toast.error(`Expiry date required for ${item.medicineName}`);
      if (item.receivedQty <= 0) return toast.error(`Received qty required for ${item.medicineName}`);
    }
    setSaving(true);
    try {
      const { data } = await API.post('/purchase/grn', { supplierId, items, supplierInvoiceNo, notes });
      toast.success(`GRN ${data.data.grnNumber} created — Stock updated!`);
      setItems([]); setSupplierId(''); setSupplierInvoiceNo(''); setNotes('');
      setTab('history'); fetchGRNs();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Goods Received Note (GRN)</h1><p className="text-gray-500 text-sm">Receive stock from suppliers with batch & expiry</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('create')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'create' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>Create GRN</button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'history' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>History</button>
      </div>

      {tab === 'create' && (
        <>
          {/* Header */}
          <div className="card mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="label">Supplier *</label>
                <select className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.supplierName}</option>)}
                </select>
              </div>
              <div><label className="label">Supplier Invoice #</label><input className="input-field" value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} /></div>
              <div><label className="label">Notes</label><input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
          </div>

          {/* Search */}
          <div className="card mb-4">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9" placeholder="Search medicine to receive..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border max-h-60 overflow-y-auto">
                  {searchResults.map(m => (
                    <button key={m._id} onClick={() => addItem(m)} className="w-full px-4 py-2 flex items-center justify-between hover:bg-primary-50 text-left border-b border-gray-50 text-sm">
                      <div><p className="font-medium">{m.medicineName}</p><p className="text-xs text-gray-400">{m.genericName}</p></div>
                      <span className="text-xs text-gray-400">Stock: {m.currentStock}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items with batch/expiry */}
          {items.length > 0 && (
            <div className="card mb-4 overflow-x-auto p-3">
              <table className="w-full text-sm">
                <thead><tr className="table-header text-[10px]">
                  <th className="px-2 py-1">Medicine</th><th className="px-2 py-1">Batch # *</th><th className="px-2 py-1">Expiry *</th>
                  <th className="px-2 py-1">Recv Qty *</th><th className="px-2 py-1">Free</th>
                  <th className="px-2 py-1">Cost</th><th className="px-2 py-1">MRP</th><th className="px-2 py-1">Sale</th>
                  <th className="px-2 py-1 text-right">Total</th><th className="px-2 py-1"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1.5 text-xs font-medium max-w-[120px] truncate">{item.medicineName}</td>
                      <td className="px-2 py-1.5"><input className="input-field text-xs py-1 w-24" placeholder="B001" value={item.batchNumber} onChange={(e) => updateItemStr(idx, 'batchNumber', e.target.value)} /></td>
                      <td className="px-2 py-1.5"><input type="date" className="input-field text-xs py-1 w-32" value={item.expiryDate} onChange={(e) => updateItemStr(idx, 'expiryDate', e.target.value)} /></td>
                      <td className="px-2 py-1.5"><input type="number" min="1" className="input-field text-xs py-1 w-16" value={item.receivedQty || ''} onChange={(e) => updateItem(idx, 'receivedQty', e.target.value)} /></td>
                      <td className="px-2 py-1.5"><input type="number" min="0" className="input-field text-xs py-1 w-14" value={item.freeQty || ''} onChange={(e) => updateItem(idx, 'freeQty', e.target.value)} /></td>
                      <td className="px-2 py-1.5"><input type="number" step="0.01" className="input-field text-xs py-1 w-20" value={item.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)} /></td>
                      <td className="px-2 py-1.5"><input type="number" step="0.01" className="input-field text-xs py-1 w-20" value={item.mrp} onChange={(e) => updateItem(idx, 'mrp', e.target.value)} /></td>
                      <td className="px-2 py-1.5"><input type="number" step="0.01" className="input-field text-xs py-1 w-20" value={item.salePrice} onChange={(e) => updateItem(idx, 'salePrice', e.target.value)} /></td>
                      <td className="px-2 py-1.5 text-right font-bold text-xs">{formatCurrency(item.unitCost * item.receivedQty)}</td>
                      <td className="px-2 py-1.5"><button onClick={() => removeItem(idx)} className="p-1 hover:bg-red-50 rounded"><HiOutlineTrash className="w-3.5 h-3.5 text-red-400" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center mt-4 pt-3 border-t">
                <span className="text-sm text-gray-500">{items.length} items, {items.reduce((s, i) => s + (i.receivedQty || 0), 0)} units</span>
                <div className="text-right">
                  <p className="text-lg font-heading font-bold text-primary-700">Total: {formatCurrency(totalCost)}</p>
                </div>
              </div>

              <div className="flex justify-end mt-3">
                <button onClick={handleSubmit} disabled={saving} className="btn-primary px-8 py-3 text-base">
                  {saving ? 'Processing...' : '✓ Receive Goods & Update Stock'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="card overflow-hidden p-0">
          {loadingHistory ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
          ) : grns.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No GRNs yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-3">GRN #</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3 hidden md:table-cell">Items</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {grns.map(g => (
                  <tr key={g._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-primary-600">{g.grnNumber}</td>
                    <td className="px-4 py-3 font-medium">{g.supplierName || g.supplierId?.supplierName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{g.supplierInvoiceNo || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{g.items?.length}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(g.totalCost)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(g.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
