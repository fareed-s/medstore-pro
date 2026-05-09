// Add or edit a controlled medicine. On `/secure/medicines/new` it creates;
// on `/secure/medicines/:id/edit` it loads the existing doc and lets the user:
//   1) edit the top-level fields
//   2) add new batches (stock-in)
//   3) edit / remove existing batches
//
// Batches are mandatory by regulation, so the create form requires the FIRST
// batch inline with the medicine itself. Subsequent batches are added via the
// "Add Batch" panel that appears after save.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  HiOutlineArrowLeft, HiOutlineCheck, HiOutlinePlus, HiOutlineTrash,
  HiOutlinePencilAlt, HiOutlineX, HiOutlineExclamationCircle,
  HiOutlineScale, HiOutlineClipboardList,
} from 'react-icons/hi';
import { controlledApi } from '../../context/ControlledModuleContext';
import { apiError, formatCurrency, formatDate, formatDateTime } from '../../utils/helpers';
import { confirmDanger } from '../../utils/swal';

// Reasons mirror the server-side enum. Keep labels short — they go into a dropdown.
const ADJUSTMENT_REASONS = [
  { value: 'damage',             label: 'Damage / Breakage' },
  { value: 'expiry',             label: 'Expiry write-off' },
  { value: 'theft',              label: 'Theft / Loss' },
  { value: 'data-correction',    label: 'Data-entry correction' },
  { value: 'inventory-count',    label: 'Physical count adjustment' },
  { value: 'return-to-supplier', label: 'Returned to supplier' },
  { value: 'dispensary-use',     label: 'Internal dispensary use' },
  { value: 'other',              label: 'Other (notes required)' },
];
const REASON_LABEL = Object.fromEntries(ADJUSTMENT_REASONS.map((r) => [r.value, r.label]));

const SCHEDULES = ['Schedule-H', 'Schedule-H1', 'Schedule-X'];
const CATEGORIES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Solution', 'Drops', 'Patch', 'Other'];
const STORAGE = ['Room Temperature', 'Refrigerate (2-8°C)', 'Freeze', 'Protect from Light'];

const blank = () => ({
  medicineName: '', genericName: '', manufacturer: '',
  schedule: 'Schedule-H1', narcoticLicenseNumber: '',
  category: 'Tablet', strength: '', unitOfMeasure: 'tablet', packSize: '1',
  defaultCostPrice: 0, defaultMrp: 0, defaultSalePrice: 0,
  maxQuantityPerSale: 0, requiresPrescription: true,
  lowStockThreshold: 5, storageCondition: 'Room Temperature', notes: '',
});

const blankBatch = () => ({
  batchNumber: '', expiryDate: '', quantity: '',
  costPrice: '', mrp: '', salePrice: '', source: '',
});

export default function ControlledMedicineFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(blank());
  const [initialBatch, setInitialBatch] = useState(blankBatch());
  const [item, setItem] = useState(null);   // populated on edit
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await controlledApi.get(`/medicines/${id}`);
        if (cancelled) return;
        setItem(data.data);
        setForm({
          medicineName: data.data.medicineName || '',
          genericName: data.data.genericName || '',
          manufacturer: data.data.manufacturer || '',
          schedule: data.data.schedule || 'Schedule-H1',
          narcoticLicenseNumber: data.data.narcoticLicenseNumber || '',
          category: data.data.category || 'Tablet',
          strength: data.data.strength || '',
          unitOfMeasure: data.data.unitOfMeasure || 'tablet',
          packSize: data.data.packSize || '1',
          defaultCostPrice: data.data.defaultCostPrice || 0,
          defaultMrp: data.data.defaultMrp || 0,
          defaultSalePrice: data.data.defaultSalePrice || 0,
          maxQuantityPerSale: data.data.maxQuantityPerSale || 0,
          requiresPrescription: data.data.requiresPrescription ?? true,
          lowStockThreshold: data.data.lowStockThreshold || 5,
          storageCondition: data.data.storageCondition || 'Room Temperature',
          notes: data.data.notes || '',
        });
      } catch (err) {
        toast.error(apiError(err, 'Failed to load'));
        navigate('/secure/medicines');
      } finally {
        !cancelled && setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit, navigate]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setBatch = (k, v) => setInitialBatch((b) => ({ ...b, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.medicineName.trim()) {
      toast.error('Medicine name is required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const { data } = await controlledApi.put(`/medicines/${id}`, form);
        setItem(data.data);
        toast.success('Saved');
      } else {
        // Validate first batch — required for new entries
        if (!initialBatch.batchNumber || !initialBatch.expiryDate || !initialBatch.quantity) {
          toast.error('Initial batch (number, expiry, quantity) is required');
          setSaving(false);
          return;
        }
        const { data } = await controlledApi.post('/medicines', {
          ...form,
          initialBatch: {
            ...initialBatch,
            quantity: Number(initialBatch.quantity),
            costPrice: Number(initialBatch.costPrice) || form.defaultCostPrice,
            mrp: Number(initialBatch.mrp) || form.defaultMrp,
            salePrice: Number(initialBatch.salePrice) || form.defaultSalePrice,
          },
        });
        toast.success('Medicine added');
        navigate(`/secure/medicines/${data.data._id}/edit`, { replace: true });
      }
    } catch (err) {
      toast.error(apiError(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/secure/medicines')} className="text-gray-400 hover:text-gray-200 text-sm flex items-center gap-1.5 mb-3">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to medicines
      </button>

      <h1 className="text-2xl font-heading font-bold text-white mb-1">
        {isEdit ? 'Edit Medicine' : 'New Controlled Medicine'}
      </h1>
      <p className="text-sm text-gray-400 mb-5">
        {isEdit
          ? 'Updates here are logged. Stock changes happen via batches.'
          : 'Provide the medicine details and the first stock batch.'}
      </p>

      <form onSubmit={submit} className="space-y-5">
        <Section title="Identity">
          <Field label="Medicine Name" required>
            <Input value={form.medicineName} onChange={(v) => set('medicineName', v)} required />
          </Field>
          <Field label="Generic Name">
            <Input value={form.genericName} onChange={(v) => set('genericName', v)} />
          </Field>
          <Field label="Manufacturer">
            <Input value={form.manufacturer} onChange={(v) => set('manufacturer', v)} />
          </Field>
          <Field label="Strength">
            <Input value={form.strength} onChange={(v) => set('strength', v)} placeholder="e.g. 10mg" />
          </Field>
        </Section>

        <Section title="Regulatory">
          <Field label="Schedule" required>
            <Select value={form.schedule} onChange={(v) => set('schedule', v)} options={SCHEDULES} />
          </Field>
          <Field label="Narcotic License Number">
            <Input value={form.narcoticLicenseNumber} onChange={(v) => set('narcoticLicenseNumber', v)} />
          </Field>
          <Field label="Max Qty Per Sale" hint="0 = no cap">
            <Input type="number" min={0} value={form.maxQuantityPerSale} onChange={(v) => set('maxQuantityPerSale', Number(v) || 0)} />
          </Field>
          <Field label="Requires Prescription">
            <Toggle checked={form.requiresPrescription} onChange={(v) => set('requiresPrescription', v)} />
          </Field>
        </Section>

        <Section title="Form & Packaging">
          <Field label="Category">
            <Select value={form.category} onChange={(v) => set('category', v)} options={CATEGORIES} />
          </Field>
          <Field label="Unit of Measure">
            <Input value={form.unitOfMeasure} onChange={(v) => set('unitOfMeasure', v)} placeholder="e.g. tablet, ml, vial" />
          </Field>
          <Field label="Pack Size">
            <Input value={form.packSize} onChange={(v) => set('packSize', v)} placeholder="e.g. 10x10" />
          </Field>
          <Field label="Storage">
            <Select value={form.storageCondition} onChange={(v) => set('storageCondition', v)} options={STORAGE} />
          </Field>
        </Section>

        <Section title="Default Pricing">
          <Field label="Cost Price">
            <Input type="number" step="0.01" min={0} value={form.defaultCostPrice} onChange={(v) => set('defaultCostPrice', Number(v) || 0)} />
          </Field>
          <Field label="MRP">
            <Input type="number" step="0.01" min={0} value={form.defaultMrp} onChange={(v) => set('defaultMrp', Number(v) || 0)} />
          </Field>
          <Field label="Sale Price">
            <Input type="number" step="0.01" min={0} value={form.defaultSalePrice} onChange={(v) => set('defaultSalePrice', Number(v) || 0)} />
          </Field>
          <Field label="Low Stock Threshold">
            <Input type="number" min={0} value={form.lowStockThreshold} onChange={(v) => set('lowStockThreshold', Number(v) || 0)} />
          </Field>
        </Section>

        <Section title="Notes" cols={1}>
          <Field label="Notes" full>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500/50"
              placeholder="Internal notes — visible only inside this module."
            />
          </Field>
        </Section>

        {!isEdit && (
          <Section title="Initial Batch (mandatory)">
            <Field label="Batch Number" required>
              <Input value={initialBatch.batchNumber} onChange={(v) => setBatch('batchNumber', v)} />
            </Field>
            <Field label="Expiry Date" required>
              <Input type="date" value={initialBatch.expiryDate} onChange={(v) => setBatch('expiryDate', v)} />
            </Field>
            <Field label="Quantity" required>
              <Input type="number" min={1} value={initialBatch.quantity} onChange={(v) => setBatch('quantity', v)} />
            </Field>
            <Field label="Source / Supplier">
              <Input value={initialBatch.source} onChange={(v) => setBatch('source', v)} placeholder="optional" />
            </Field>
            <Field label="Cost Price (this batch)" hint="leave blank to use default">
              <Input type="number" step="0.01" min={0} value={initialBatch.costPrice} onChange={(v) => setBatch('costPrice', v)} />
            </Field>
            <Field label="Sale Price (this batch)" hint="leave blank to use default">
              <Input type="number" step="0.01" min={0} value={initialBatch.salePrice} onChange={(v) => setBatch('salePrice', v)} />
            </Field>
          </Section>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
          <button type="button" onClick={() => navigate('/secure/medicines')} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-1.5">
            <HiOutlineCheck className="w-4 h-4" />
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Medicine'}
          </button>
        </div>
      </form>

      {/* Batches panel — only on edit */}
      {isEdit && item && (
        <BatchesPanel item={item} onChange={(updated) => setItem(updated)} />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
function BatchesPanel({ item, onChange }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [adjustingBatch, setAdjustingBatch] = useState(null);    // full batch object
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(blankBatch());

  const startAdd = () => {
    setForm({
      ...blankBatch(),
      costPrice: item.defaultCostPrice || '',
      mrp: item.defaultMrp || '',
      salePrice: item.defaultSalePrice || '',
    });
    setAdding(true);
    setEditingId(null);
  };

  const startEdit = (b) => {
    // Note: quantity is intentionally NOT loaded into the edit form. Stock
    // changes go through the Adjust modal so a reason gets recorded.
    setForm({
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate?.slice(0, 10) || '',
      quantity: b.quantity,           // kept for the inline read-only display below
      costPrice: b.costPrice,
      mrp: b.mrp,
      salePrice: b.salePrice,
      source: b.source || '',
    });
    setEditingId(b._id);
    setAdding(false);
  };

  const cancel = () => { setAdding(false); setEditingId(null); };

  const saveBatch = async (e) => {
    e?.preventDefault?.();
    if (!form.batchNumber || !form.expiryDate) {
      toast.error('Batch number and expiry are required');
      return;
    }
    // Adding a fresh batch still needs a starting quantity — that's not an
    // adjustment, it's the initial stock-in.
    if (adding && (form.quantity === '' || form.quantity === null)) {
      toast.error('Quantity is required when adding a new batch');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        batchNumber: form.batchNumber,
        expiryDate: form.expiryDate,
        costPrice: form.costPrice === '' ? undefined : Number(form.costPrice),
        mrp: form.mrp === '' ? undefined : Number(form.mrp),
        salePrice: form.salePrice === '' ? undefined : Number(form.salePrice),
        source: form.source,
      };
      // Quantity is only sent when CREATING a batch — not on update.
      if (adding) payload.quantity = Number(form.quantity);

      const { data } = editingId
        ? await controlledApi.put(`/medicines/${item._id}/batches/${editingId}`, payload)
        : await controlledApi.post(`/medicines/${item._id}/batches`, payload);
      onChange(data.data);
      toast.success(editingId ? 'Batch updated' : 'Batch added');
      cancel();
    } catch (err) {
      toast.error(apiError(err, 'Failed to save batch'));
    } finally {
      setBusy(false);
    }
  };

  const removeBatch = async (b) => {
    const ok = await confirmDanger(
      `Batch ${b.batchNumber} (${b.quantity} units) will be permanently removed.`,
      { title: 'Remove batch?', confirmText: 'Remove', cancelText: 'Cancel' }
    );
    if (!ok) return;
    try {
      const { data } = await controlledApi.delete(`/medicines/${item._id}/batches/${b._id}`);
      onChange(data.data);
      toast.success('Batch removed');
    } catch (err) {
      toast.error(apiError(err, 'Failed to remove'));
    }
  };

  // FIFO for display: earliest expiry first.
  const sorted = useMemo(
    () => [...(item.batches || [])].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)),
    [item.batches]
  );

  return (
    <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-white">Batches</h2>
          <p className="text-xs text-gray-400">
            {item.batches?.length || 0} batch(es) · {item.currentStock || 0} {item.unitOfMeasure} in stock
          </p>
        </div>
        {!adding && !editingId && (
          <button onClick={startAdd} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-1.5">
            <HiOutlinePlus className="w-4 h-4" /> Add Batch
          </button>
        )}
      </div>

      {(adding || editingId) && (
        <form onSubmit={saveBatch} className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-gray-800 bg-gray-950">
          <Field label="Batch Number" required>
            <Input value={form.batchNumber} onChange={(v) => setForm({ ...form, batchNumber: v })} />
          </Field>
          <Field label="Expiry Date" required>
            <Input type="date" value={form.expiryDate} onChange={(v) => setForm({ ...form, expiryDate: v })} />
          </Field>
          {adding ? (
            <Field label="Quantity" required>
              <Input type="number" min={0} value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
            </Field>
          ) : (
            // On edit, quantity is read-only — direct edits would skip the
            // audit trail. Operator must use the Adjust button instead.
            <Field label="Quantity" hint="use Adjust to change">
              <div className="px-2.5 py-1.5 rounded-md bg-gray-900 border border-gray-800 text-gray-500 text-sm font-mono">
                {form.quantity}
              </div>
            </Field>
          )}
          <Field label="Cost Price">
            <Input type="number" step="0.01" min={0} value={form.costPrice} onChange={(v) => setForm({ ...form, costPrice: v })} />
          </Field>
          <Field label="MRP">
            <Input type="number" step="0.01" min={0} value={form.mrp} onChange={(v) => setForm({ ...form, mrp: v })} />
          </Field>
          <Field label="Sale Price">
            <Input type="number" step="0.01" min={0} value={form.salePrice} onChange={(v) => setForm({ ...form, salePrice: v })} />
          </Field>
          <Field label="Source / Supplier" full>
            <Input value={form.source} onChange={(v) => setForm({ ...form, source: v })} placeholder="optional" />
          </Field>
          <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
            <button type="button" onClick={cancel} className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm border border-gray-700">
              <HiOutlineX className="w-4 h-4 inline" /> Cancel
            </button>
            <button type="submit" disabled={busy} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">
              <HiOutlineCheck className="w-4 h-4 inline" /> {busy ? 'Saving…' : editingId ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">No batches yet — click "Add Batch" to record stock.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
              <th className="px-4 py-2.5">Batch</th>
              <th className="px-4 py-2.5">Expiry</th>
              <th className="px-4 py-2.5 text-right">Qty</th>
              <th className="px-4 py-2.5 text-right">Cost</th>
              <th className="px-4 py-2.5 text-right">Sale</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {sorted.map((b) => {
              const exp = new Date(b.expiryDate);
              const days = Math.floor((exp - new Date()) / 86400000);
              const expired = days < 0;
              const expiringSoon = days >= 0 && days <= 60;
              return (
                <tr key={b._id} className="hover:bg-gray-800/40">
                  <td className="px-4 py-2.5 text-gray-200 font-mono">{b.batchNumber}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className={expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : 'text-gray-300'}>
                      {formatDate(b.expiryDate)}
                    </span>
                    {expired && <p className="text-[10px] text-red-400 flex items-center gap-1"><HiOutlineExclamationCircle className="w-3 h-3"/> expired</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-100 font-mono">{b.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-gray-300 font-mono">{formatCurrency(b.costPrice)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-100 font-mono">{formatCurrency(b.salePrice)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setAdjustingBatch(b)}
                        title="Adjust stock (logged with reason)"
                        className="p-1.5 rounded hover:bg-amber-500/15 text-amber-400"
                      >
                        <HiOutlineScale className="w-4 h-4" />
                      </button>
                      <button onClick={() => startEdit(b)} title="Edit batch details" className="p-1.5 rounded hover:bg-blue-500/15 text-blue-400">
                        <HiOutlinePencilAlt className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeBatch(b)} title="Remove batch" className="p-1.5 rounded hover:bg-red-500/15 text-red-400">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {adjustingBatch && (
        <AdjustStockModal
          item={item}
          batch={adjustingBatch}
          onClose={() => setAdjustingBatch(null)}
          onSaved={(updated) => { onChange(updated); setAdjustingBatch(null); }}
        />
      )}

      <AdjustmentHistory medicineId={item._id} refreshKey={item.currentStock} />
    </div>
  );
}

// ─── Adjust Stock Modal ─────────────────────────────────────────────────────
// Strict, regulator-friendly stock change. New quantity (NOT delta), reason
// dropdown required, notes mandatory for "other". Shows before/after at a
// glance so the operator can sanity-check.
function AdjustStockModal({ item, batch, onClose, onSaved }) {
  const current = Number(batch.quantity) || 0;
  const [newQty, setNewQty] = useState(String(current));
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const parsedNew = newQty === '' ? null : Number(newQty);
  const delta = parsedNew !== null && Number.isFinite(parsedNew) ? parsedNew - current : 0;
  const valid = parsedNew !== null && Number.isFinite(parsedNew) && parsedNew >= 0 && delta !== 0 && reason
    && (reason !== 'other' || notes.trim().length > 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const { data } = await controlledApi.post(
        `/medicines/${item._id}/batches/${batch._id}/adjust`,
        { newQuantity: parsedNew, reason, notes }
      );
      toast.success('Stock adjusted · audit row recorded');
      onSaved(data.data);
    } catch (err) {
      toast.error(apiError(err, 'Adjustment failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md my-4 sm:my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <HiOutlineScale className="w-5 h-5 text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-white">Adjust Stock</p>
            <p className="text-[11px] text-gray-400 truncate">{item.medicineName} · Batch {batch.batchNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><HiOutlineX className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-4">
          {/* Before / Δ / After preview */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Current</p>
              <p className="text-xl font-mono font-bold text-gray-200">{current}</p>
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Change</p>
              <p className={`text-xl font-mono font-bold ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                {delta > 0 ? '+' : ''}{delta}
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-amber-400/80">New</p>
              <p className="text-xl font-mono font-bold text-amber-200">
                {parsedNew !== null && Number.isFinite(parsedNew) ? parsedNew : '—'}
              </p>
            </div>
          </div>

          <Field label="New Quantity" required>
            <Input type="number" min={0} value={newQty} onChange={setNewQty} autoFocus />
          </Field>

          <Field label="Reason" required>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-gray-950 border border-gray-800 text-gray-100 text-sm focus:outline-none focus:border-amber-500/50"
              required
            >
              <option value="">— select reason —</option>
              {ADJUSTMENT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>

          <Field label={`Notes${reason === 'other' ? ' (required)' : ' (optional)'}`}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 rounded-md bg-gray-950 border border-gray-800 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500/50"
              placeholder="e.g. invoice no. / counter-signed by …"
            />
          </Field>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-[11px] text-amber-200/90 flex items-start gap-2">
            <HiOutlineClipboardList className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>This change is permanent and recorded in the audit log with your name, the reason, and the timestamp. It cannot be edited later.</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm border border-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={!valid || busy} className="flex-1 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center justify-center gap-1.5">
              <HiOutlineCheck className="w-4 h-4" /> {busy ? 'Recording…' : 'Record Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Adjustment History — collapsible audit feed for THIS medicine ──────────
function AdjustmentHistory({ medicineId, refreshKey }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Refetch when:
  //  • panel is opened
  //  • parent stock changed (refreshKey) — implies a new adjustment may exist
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    controlledApi.get(`/medicines/${medicineId}/adjustments`)
      .then((r) => { if (!cancelled) setRows(r.data.data); })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, medicineId, refreshKey]);

  return (
    <div className="border-t border-gray-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
      >
        <span className="flex items-center gap-2">
          <HiOutlineClipboardList className="w-4 h-4" />
          Stock Adjustment History
        </span>
        <span>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {loading ? (
            <p className="text-center text-xs text-gray-500 py-4">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-4">No adjustments recorded.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
                  <th className="py-1.5">Date</th>
                  <th className="py-1.5">Batch</th>
                  <th className="py-1.5">Reason</th>
                  <th className="py-1.5 text-right">Was</th>
                  <th className="py-1.5 text-right">Δ</th>
                  <th className="py-1.5 text-right">Now</th>
                  <th className="py-1.5">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td className="py-1.5 text-gray-400 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td className="py-1.5 font-mono text-gray-300">{r.batchNumber}</td>
                    <td className="py-1.5 text-gray-200">
                      {REASON_LABEL[r.reason] || r.reason}
                      {r.notes && <p className="text-[10px] text-gray-500 italic">{r.notes}</p>}
                    </td>
                    <td className="py-1.5 text-right font-mono text-gray-400">{r.previousQuantity}</td>
                    <td className={`py-1.5 text-right font-mono ${r.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.delta > 0 ? '+' : ''}{r.delta}
                    </td>
                    <td className="py-1.5 text-right font-mono text-gray-100">{r.newQuantity}</td>
                    <td className="py-1.5 text-gray-300">{r.adjustedByName}</td>
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

// ─── primitives — dark-themed to match SecureLayout ────────────────────────
function Section({ title, children, cols = 2 }) {
  // Static class strings so Tailwind's JIT picks them up (`grid-cols-${n}` won't compile).
  const grid = cols === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-3">{title}</h3>
      <div className={`grid ${grid} gap-3`}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, required, children, full }) {
  return (
    <div className={full ? 'sm:col-span-full' : ''}>
      <label className="block text-xs font-medium text-gray-300 mb-1.5">
        {required && <span className="text-red-400 mr-0.5">*</span>}{label}
        {hint && <span className="text-gray-500 ml-1.5">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500/50"
      {...rest}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-100 focus:outline-none focus:border-red-500/50"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full p-0.5 transition-colors ${checked ? 'bg-red-600' : 'bg-gray-700'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  );
}
