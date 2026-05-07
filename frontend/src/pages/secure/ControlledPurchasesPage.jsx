// Goods-receipt note (GRN) page for the hidden module. Lists past purchases
// AND lets the operator record a new one in a slide-out form.
//
// Recording a purchase pushes the entered batches onto the referenced
// medicines automatically — same effect as Phase-2's "add batch" flow,
// but grouped under a supplier invoice for traceability.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlineTruck, HiOutlineX,
  HiOutlineTrash, HiOutlineCheck, HiOutlineSelector,
} from 'react-icons/hi';
import { controlledApi } from '../../context/ControlledModuleContext';
import { apiError, formatCurrency, formatDate, formatDateTime } from '../../utils/helpers';

export default function ControlledPurchasesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [open, setOpen] = useState(null);   // purchase being viewed

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const { data } = await controlledApi.get(`/purchases?${params}`);
      setList(data.data);
    } catch (err) {
      toast.error(apiError(err, 'Failed to load purchases'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchData, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Purchases</h1>
          <p className="text-sm text-gray-400">{list.length} GRN(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-1.5 self-start">
          <HiOutlinePlus className="w-4 h-4" /> New Purchase
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4">
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search GRN / supplier / supplier invoice"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500/50"
          />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <HiOutlineTruck className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No purchases recorded yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <th className="px-4 py-3">GRN</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 hidden md:table-cell">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 hidden sm:table-cell">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {list.map((p) => (
                <tr key={p._id} onClick={() => setOpen(p)} className="hover:bg-gray-800/40 cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-mono text-gray-100">{p.grnNumber}</p>
                    <p className="text-[11px] text-gray-500">{formatDateTime(p.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{p.supplierName}</p>
                    {p.supplierInvoiceNo && <p className="text-[11px] text-gray-500">Inv: {p.supplierInvoiceNo}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-300 text-xs">
                    {p.items?.length || 0} item(s) · {(p.items || []).reduce((s, i) => s + (i.quantity || 0), 0)} units
                  </td>
                  <td className="px-4 py-3 text-right text-gray-100 font-mono">{formatCurrency(p.totalAmount)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">{p.receivedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <NewPurchaseModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchData(); }} />}
      {open && <PurchaseDetailModal purchase={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ─── Detail modal — read-only GRN view ──────────────────────────────────────
function PurchaseDetailModal({ purchase, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl my-4 sm:my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div>
            <p className="font-mono text-gray-100 font-semibold">{purchase.grnNumber}</p>
            <p className="text-[11px] text-gray-500">{formatDateTime(purchase.createdAt)} · {purchase.receivedByName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><HiOutlineX className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <KV k="Supplier" v={purchase.supplierName} />
            <KV k="License" v={purchase.supplierLicenseNumber} />
            <KV k="Phone" v={purchase.supplierPhone} />
            <KV k="Address" v={purchase.supplierAddress} />
            <KV k="Supplier Invoice" v={purchase.supplierInvoiceNo} />
            <KV k="Invoice Date" v={purchase.supplierInvoiceDate ? formatDate(purchase.supplierInvoiceDate) : '—'} />
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <th className="py-2">Medicine</th>
                <th className="py-2">Batch</th>
                <th className="py-2">Expiry</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Cost</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {(purchase.items || []).map((it, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-200">
                    {it.medicineName}
                    <span className="text-[10px] text-gray-500 ml-1">{it.schedule}</span>
                  </td>
                  <td className="py-2 text-gray-300 font-mono">{it.batchNumber}</td>
                  <td className="py-2 text-gray-400">{formatDate(it.expiryDate)}</td>
                  <td className="py-2 text-right text-gray-100 font-mono">{it.quantity}</td>
                  <td className="py-2 text-right text-gray-300 font-mono">{formatCurrency(it.costPrice)}</td>
                  <td className="py-2 text-right text-gray-100 font-mono">{formatCurrency(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-gray-800 pt-2 space-y-1 text-sm font-mono">
            <div className="flex justify-between text-gray-300"><span>Subtotal</span><span>{formatCurrency(purchase.subtotal)}</span></div>
            {purchase.taxAmount > 0 && <div className="flex justify-between text-gray-300"><span>Tax</span><span>{formatCurrency(purchase.taxAmount)}</span></div>}
            <div className="flex justify-between text-white font-bold border-t border-gray-800 pt-1"><span>Total</span><span>{formatCurrency(purchase.totalAmount)}</span></div>
          </div>

          {purchase.notes && <p className="text-xs text-gray-400 italic">Note: {purchase.notes}</p>}
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div>
      <p className="text-gray-500 uppercase tracking-wider">{k}</p>
      <p className="text-gray-200">{v || '—'}</p>
    </div>
  );
}

// ─── New purchase form — multi-item + supplier block ────────────────────────
const blankLine = () => ({
  medicineId: '', medicineName: '',
  batchNumber: '', expiryDate: '',
  quantity: '', costPrice: '', mrp: '', salePrice: '',
});

function NewPurchaseModal({ onClose, onSaved }) {
  const [supplier, setSupplier] = useState({
    name: '', license: '', phone: '', address: '', invoiceNo: '', invoiceDate: '',
  });
  const [taxAmount, setTaxAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([blankLine()]);
  const [meds, setMeds] = useState([]);
  const [saving, setSaving] = useState(false);

  // Pull the catalog once so each line's medicine picker is instant.
  useEffect(() => {
    controlledApi.get('/medicines').then((r) => setMeds(r.data.data.filter((m) => m.isActive))).catch(() => {});
  }, []);

  const setLine = (i, patch) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines((prev) => [...prev, blankLine()]);
  const removeLine = (i) => setLines((prev) => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  const onPickMedicine = (i, id) => {
    const m = meds.find((x) => x._id === id);
    if (!m) return setLine(i, { medicineId: '', medicineName: '' });
    setLine(i, {
      medicineId: m._id,
      medicineName: m.medicineName,
      // Prefill prices from the medicine's defaults — receiver can override.
      costPrice: m.defaultCostPrice || '',
      mrp: m.defaultMrp || '',
      salePrice: m.defaultSalePrice || '',
    });
  };

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.costPrice) || 0), 0),
    [lines]
  );
  const total = subtotal + (Number(taxAmount) || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!supplier.name.trim()) { toast.error('Supplier name is required'); return; }
    const goodLines = lines.filter((l) => l.medicineId && l.batchNumber && l.expiryDate && l.quantity > 0 && l.costPrice >= 0);
    if (goodLines.length === 0) { toast.error('Add at least one valid line'); return; }

    setSaving(true);
    try {
      await controlledApi.post('/purchases', {
        supplierName: supplier.name,
        supplierLicenseNumber: supplier.license,
        supplierPhone: supplier.phone,
        supplierAddress: supplier.address,
        supplierInvoiceNo: supplier.invoiceNo,
        supplierInvoiceDate: supplier.invoiceDate || undefined,
        items: goodLines.map((l) => ({
          medicineId: l.medicineId,
          batchNumber: l.batchNumber,
          expiryDate: l.expiryDate,
          quantity: Number(l.quantity),
          costPrice: Number(l.costPrice) || 0,
          mrp: Number(l.mrp) || 0,
          salePrice: Number(l.salePrice) || 0,
        })),
        taxAmount: Number(taxAmount) || 0,
        notes,
      });
      toast.success('Purchase recorded — stock added');
      onSaved();
    } catch (err) {
      toast.error(apiError(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl my-4 sm:my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <p className="font-heading font-bold text-white">New Purchase</p>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><HiOutlineX className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Supplier</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input placeholder="Supplier Name *" value={supplier.name} onChange={(v) => setSupplier({ ...supplier, name: v })} />
              <Input placeholder="License Number" value={supplier.license} onChange={(v) => setSupplier({ ...supplier, license: v })} />
              <Input placeholder="Phone" value={supplier.phone} onChange={(v) => setSupplier({ ...supplier, phone: v })} />
              <Input placeholder="Supplier Invoice No." value={supplier.invoiceNo} onChange={(v) => setSupplier({ ...supplier, invoiceNo: v })} />
              <Input placeholder="Address" value={supplier.address} onChange={(v) => setSupplier({ ...supplier, address: v })} />
              <Input type="date" placeholder="Invoice Date" value={supplier.invoiceDate} onChange={(v) => setSupplier({ ...supplier, invoiceDate: v })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">Items</p>
              <button type="button" onClick={addLine} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <HiOutlinePlus className="w-3.5 h-3.5" /> Add line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="bg-gray-950 border border-gray-800 rounded-lg p-2 grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div className="col-span-2 relative">
                    <select
                      value={l.medicineId}
                      onChange={(e) => onPickMedicine(i, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md bg-gray-900 border border-gray-800 text-gray-100 text-sm focus:outline-none focus:border-red-500/50"
                    >
                      <option value="">— pick medicine —</option>
                      {meds.map((m) => (
                        <option key={m._id} value={m._id}>{m.medicineName} · {m.schedule}</option>
                      ))}
                    </select>
                  </div>
                  <Input placeholder="Batch #" value={l.batchNumber} onChange={(v) => setLine(i, { batchNumber: v })} />
                  <Input type="date" placeholder="Expiry" value={l.expiryDate} onChange={(v) => setLine(i, { expiryDate: v })} />
                  <Input type="number" min={1} placeholder="Qty" value={l.quantity} onChange={(v) => setLine(i, { quantity: v })} />
                  <div className="flex items-center gap-1">
                    <Input type="number" step="0.01" min={0} placeholder="Cost" value={l.costPrice} onChange={(v) => setLine(i, { costPrice: v })} />
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="p-1.5 rounded text-red-400 hover:bg-red-500/15 flex-shrink-0">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input type="number" step="0.01" min={0} placeholder="Tax / extra charges" value={taxAmount} onChange={(v) => setTaxAmount(v)} />
            <Input placeholder="Notes" value={notes} onChange={setNotes} />
          </div>

          <div className="border-t border-gray-800 pt-2 space-y-1 font-mono text-sm">
            <div className="flex justify-between text-gray-300"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-white font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-1.5">
              <HiOutlineCheck className="w-4 h-4" /> {saving ? 'Saving…' : 'Record Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ value, onChange, type = 'text', className = '', ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-2.5 py-1.5 rounded-md bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-red-500/50 ${className}`}
      {...rest}
    />
  );
}
