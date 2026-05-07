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
} from 'react-icons/hi';
import { controlledApi } from '../../context/ControlledModuleContext';
import { apiError, formatCurrency, formatDate } from '../../utils/helpers';
import { confirmDanger } from '../../utils/swal';

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
    setForm({
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate?.slice(0, 10) || '',
      quantity: b.quantity,
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
    if (!form.batchNumber || !form.expiryDate || form.quantity === '' || form.quantity === null) {
      toast.error('Batch number, expiry, and quantity are required');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        costPrice: form.costPrice === '' ? undefined : Number(form.costPrice),
        mrp: form.mrp === '' ? undefined : Number(form.mrp),
        salePrice: form.salePrice === '' ? undefined : Number(form.salePrice),
      };
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
          <Field label="Quantity" required>
            <Input type="number" min={0} value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
          </Field>
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
                      <button onClick={() => startEdit(b)} className="p-1.5 rounded hover:bg-blue-500/15 text-blue-400">
                        <HiOutlinePencilAlt className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeBatch(b)} className="p-1.5 rounded hover:bg-red-500/15 text-red-400">
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
