// Controlled-drugs POS terminal.
//
// Layout (desktop): two-column grid
//   left  → search + result list
//   right → cart + patient/doctor capture + totals + Complete Sale
//
// Mobile: stacks; cart collapses below.
//
// Flow:
//   1. Operator types in search → debounced fetch from /controlled/medicines
//   2. Click a result → BatchPickerModal lets them pick batch + qty
//   3. Item lands in cart (held in component state only — no draft persistence)
//   4. If any item is Schedule-H1/X, the patient + doctor inputs become
//      required; the Complete button stays disabled until they're filled.
//   5. Complete Sale → POST → ReceiptModal → cart cleared
//
// Stock numbers in the result list are LIVE for the current store (the
// search hits the same endpoint the medicines page uses), so the operator
// always sees the freshest counts.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  HiOutlineSearch, HiOutlinePlus, HiOutlineTrash, HiOutlineX,
  HiOutlineCheck, HiOutlineExclamationCircle, HiOutlineUser,
  HiOutlineClipboardList,
} from 'react-icons/hi';
import { controlledApi } from '../../context/ControlledModuleContext';
import { apiError, formatCurrency, formatDate } from '../../utils/helpers';
import ControlledReceipt from './ControlledReceipt';

const SCHEDULE_BADGE = {
  'Schedule-H':  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Schedule-H1': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Schedule-X':  'bg-red-500/15 text-red-300 border-red-500/30',
};
const REQUIRES_RX = new Set(['Schedule-H1', 'Schedule-X']);
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'mobile-wallet', label: 'Wallet' },
  { value: 'credit', label: 'Credit' },
];

export default function ControlledPOSPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [picker, setPicker] = useState(null);    // medicine being picked
  const [cart, setCart] = useState([]);
  const [patient, setPatient] = useState({ name: '', age: '', gender: '', address: '', phone: '', cnic: '' });
  const [doctor, setDoctor] = useState({ name: '', registrationNumber: '', prescriptionDate: '' });
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  const searchRef = useRef(null);

  // Debounced search.
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await controlledApi.get(`/medicines?search=${encodeURIComponent(search)}`);
        setResults(data.data.filter((m) => m.isActive && (m.currentStock || 0) > 0));
      } catch (err) {
        toast.error(apiError(err, 'Search failed'));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  // Cart maths
  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + (l.unitPrice * l.quantity), 0),
    [cart]
  );
  const total = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));
  const change = Math.max(0, Number(amountPaid || 0) - total);
  const rxRequired = useMemo(() => cart.some((l) => REQUIRES_RX.has(l.schedule)), [cart]);

  // Validation gate for Complete button.
  const canComplete = (() => {
    if (cart.length === 0 || submitting) return false;
    if (rxRequired) {
      if (!patient.name.trim() || !doctor.name.trim()) return false;
    }
    return true;
  })();

  const addToCart = (medicine, batch, quantity, unitPrice) => {
    setCart((prev) => {
      // Same medicine + batch already in cart → bump quantity rather than dup.
      const idx = prev.findIndex((l) => l.medicineId === medicine._id && l.batchId === batch._id);
      if (idx >= 0) {
        const next = [...prev];
        const merged = next[idx].quantity + quantity;
        if (merged > batch.quantity) {
          toast.error(`Only ${batch.quantity} units available in this batch`);
          return prev;
        }
        next[idx] = { ...next[idx], quantity: merged };
        return next;
      }
      return [
        ...prev,
        {
          medicineId: medicine._id,
          medicineName: medicine.medicineName,
          schedule: medicine.schedule,
          unitOfMeasure: medicine.unitOfMeasure,
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          stockInBatch: batch.quantity,
          quantity,
          unitPrice,
        },
      ];
    });
    setPicker(null);
    searchRef.current?.focus();
  };

  const updateLine = (idx, patch) => {
    setCart((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };
  const removeLine = (idx) => setCart((prev) => prev.filter((_, i) => i !== idx));

  const reset = () => {
    setCart([]);
    setPatient({ name: '', age: '', gender: '', address: '', phone: '', cnic: '' });
    setDoctor({ name: '', registrationNumber: '', prescriptionDate: '' });
    setDiscount(0); setTax(0); setAmountPaid(''); setNotes('');
    setSearch(''); setResults([]);
    setPaymentMethod('cash');
    searchRef.current?.focus();
  };

  const submit = async () => {
    if (!canComplete) return;
    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((l) => ({
          medicineId: l.medicineId,
          batchId: l.batchId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        patient: rxRequired ? {
          ...patient,
          age: patient.age ? Number(patient.age) : undefined,
        } : patient.name.trim() ? patient : {},  // optional patient capture for plain Schedule-H
        doctor: rxRequired ? {
          ...doctor,
          prescriptionDate: doctor.prescriptionDate || undefined,
        } : (doctor.name?.trim() ? doctor : {}),
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        paymentMethod,
        amountPaid: Number(amountPaid) || 0,
        notes,
      };
      const { data } = await controlledApi.post('/sales', payload);
      setCompletedSale(data.data);
    } catch (err) {
      toast.error(apiError(err, 'Sale failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const onReceiptClose = () => {
    setCompletedSale(null);
    reset();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Controlled POS</h1>
          <p className="text-sm text-gray-400">Sell narcotic / scheduled drugs · Rx required for Schedule-H1 / X</p>
        </div>
        {cart.length > 0 && (
          <button onClick={reset} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm border border-gray-700 flex items-center gap-1.5">
            <HiOutlineX className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ─── Left: search + results ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicine name or generic"
                autoFocus
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800/60 max-h-[60vh] overflow-y-auto">
            {searching ? (
              <p className="text-center py-6 text-sm text-gray-500">Searching…</p>
            ) : !search.trim() ? (
              <p className="text-center py-6 text-sm text-gray-500">Type to search the catalog</p>
            ) : results.length === 0 ? (
              <p className="text-center py-6 text-sm text-gray-500">No matches in stock</p>
            ) : (
              results.map((m) => (
                <button
                  key={m._id}
                  onClick={() => setPicker(m)}
                  className="w-full text-left p-3 hover:bg-gray-800/60 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-100 font-medium truncate">{m.medicineName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[m.genericName, m.strength, m.manufacturer].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`badge border ${SCHEDULE_BADGE[m.schedule]}`}>{m.schedule}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{m.currentStock} {m.unitOfMeasure}</p>
                  </div>
                  <HiOutlinePlus className="w-5 h-5 text-red-400 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* ─── Right: cart + Rx capture + totals ──────────────────── */}
        <div className="lg:col-span-3 space-y-3">
          {/* Cart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="p-3 border-b border-gray-800">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cart ({cart.length})</p>
            </div>
            {cart.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-500">Cart is empty</p>
            ) : (
              <div className="divide-y divide-gray-800/60 max-h-72 overflow-y-auto">
                {cart.map((l, i) => (
                  <div key={i} className="p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-100 text-sm font-medium truncate">{l.medicineName}</p>
                      <p className="text-[11px] text-gray-500">
                        Batch {l.batchNumber} · Exp {formatDate(l.expiryDate)} ·
                        <span className={`ml-1 ${SCHEDULE_BADGE[l.schedule]?.replace('bg-', 'text-').split(' ')[0]}`}>{l.schedule}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          min={1}
                          max={l.stockInBatch}
                          value={l.quantity}
                          onChange={(e) => {
                            const v = Math.max(1, Math.min(l.stockInBatch, Number(e.target.value) || 1));
                            updateLine(i, { quantity: v });
                          }}
                          className="w-20 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-gray-100 text-sm text-center"
                        />
                        <span className="text-xs text-gray-500">×</span>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={l.unitPrice}
                          onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 rounded bg-gray-950 border border-gray-800 text-gray-100 text-sm text-right font-mono"
                        />
                        <span className="text-sm text-gray-100 ml-auto font-mono">
                          {formatCurrency(l.unitPrice * l.quantity)}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => removeLine(i)} className="p-1.5 rounded text-red-400 hover:bg-red-500/15 flex-shrink-0">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rx capture */}
          {(rxRequired || cart.some((l) => REQUIRES_RX.has(l.schedule))) && (
            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3">
              <div className="flex items-start gap-2 mb-3">
                <HiOutlineExclamationCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-200">
                  Cart contains Schedule-H1 / Schedule-X items. Patient and prescribing doctor details are mandatory.
                </p>
              </div>

              <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <HiOutlineUser className="w-3.5 h-3.5" /> Patient
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                <Input placeholder="Name *" value={patient.name} onChange={(v) => setPatient({ ...patient, name: v })} />
                <Input placeholder="Age" type="number" min={0} value={patient.age} onChange={(v) => setPatient({ ...patient, age: v })} />
                <Select value={patient.gender} onChange={(v) => setPatient({ ...patient, gender: v })} options={[
                  { value: '', label: 'Gender' }, { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' },
                ]} />
                <Input placeholder="Phone" value={patient.phone} onChange={(v) => setPatient({ ...patient, phone: v })} />
                <Input placeholder="CNIC / ID" value={patient.cnic} onChange={(v) => setPatient({ ...patient, cnic: v })} />
                <Input placeholder="Address" className="sm:col-span-1" value={patient.address} onChange={(v) => setPatient({ ...patient, address: v })} />
              </div>

              <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <HiOutlineClipboardList className="w-3.5 h-3.5" /> Prescribing Doctor
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Input placeholder="Doctor Name *" value={doctor.name} onChange={(v) => setDoctor({ ...doctor, name: v })} />
                <Input placeholder="Reg. Number" value={doctor.registrationNumber} onChange={(v) => setDoctor({ ...doctor, registrationNumber: v })} />
                <Input type="date" value={doctor.prescriptionDate} onChange={(v) => setDoctor({ ...doctor, prescriptionDate: v })} />
              </div>
            </div>
          )}

          {/* Totals + payment */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Field label="Discount">
                <Input type="number" step="0.01" min={0} value={discount} onChange={(v) => setDiscount(v)} />
              </Field>
              <Field label="Tax">
                <Input type="number" step="0.01" min={0} value={tax} onChange={(v) => setTax(v)} />
              </Field>
              <Field label="Payment Method">
                <Select value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHODS} />
              </Field>
              <Field label="Amount Paid">
                <Input type="number" step="0.01" min={0} value={amountPaid} onChange={setAmountPaid} placeholder={String(total.toFixed(2))} />
              </Field>
              <Field label="Notes" full>
                <Input value={notes} onChange={setNotes} placeholder="optional" />
              </Field>
            </div>

            <div className="border-t border-gray-800 pt-2 space-y-1 font-mono text-sm">
              <Row label="Subtotal" value={formatCurrency(subtotal)} />
              {discount > 0 && <Row label="Discount" value={`− ${formatCurrency(discount)}`} />}
              {tax > 0 && <Row label="Tax" value={formatCurrency(tax)} />}
              <Row label="Total" value={formatCurrency(total)} bold />
              {amountPaid > 0 && <Row label="Change" value={formatCurrency(change)} />}
            </div>

            <button
              disabled={!canComplete}
              onClick={submit}
              className="w-full mt-3 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              <HiOutlineCheck className="w-4 h-4" />
              {submitting ? 'Processing…' : `Complete Sale · ${formatCurrency(total)}`}
            </button>
            {!canComplete && cart.length > 0 && rxRequired && (
              <p className="text-[11px] text-amber-400 text-center">
                Patient name and Doctor name are required to complete this sale.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {picker && <BatchPickerModal medicine={picker} onClose={() => setPicker(null)} onAdd={addToCart} />}
      {completedSale && <ControlledReceipt sale={completedSale} onClose={onReceiptClose} />}
    </div>
  );
}

// ─── Batch picker — appears when a medicine is selected from search ────────
function BatchPickerModal({ medicine, onClose, onAdd }) {
  // Sort batches FIFO — earliest expiry first, but only batches that have stock.
  const available = useMemo(
    () => (medicine.batches || [])
      .filter((b) => (b.quantity || 0) > 0)
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)),
    [medicine.batches]
  );

  const [batchId, setBatchId] = useState(available[0]?._id || '');
  const [quantity, setQuantity] = useState(1);

  const batch = available.find((b) => b._id === batchId);
  const [unitPrice, setUnitPrice] = useState(batch?.salePrice || medicine.defaultSalePrice || 0);

  // Refresh price when the picked batch changes.
  useEffect(() => {
    if (!batch) return;
    setUnitPrice(batch.salePrice || medicine.defaultSalePrice || 0);
    setQuantity((q) => Math.min(q, batch.quantity));
  }, [batchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    if (!batch) return;
    if (quantity < 1 || quantity > batch.quantity) {
      toast.error(`Quantity must be between 1 and ${batch.quantity}`);
      return;
    }
    if (medicine.maxQuantityPerSale && quantity > medicine.maxQuantityPerSale) {
      toast.error(`Cap: ${medicine.maxQuantityPerSale} per sale`);
      return;
    }
    onAdd(medicine, batch, quantity, Number(unitPrice) || 0);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <span className={`badge border ${SCHEDULE_BADGE[medicine.schedule]}`}>{medicine.schedule}</span>
          <p className="font-semibold text-white truncate flex-1">{medicine.medicineName}</p>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {available.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">No batches with stock.</p>
        ) : (
          <form onSubmit={submit} className="p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Batch</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {available.map((b) => {
                  const exp = new Date(b.expiryDate);
                  const days = Math.floor((exp - new Date()) / 86400000);
                  return (
                    <label
                      key={b._id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                        batchId === b._id
                          ? 'border-red-500/50 bg-red-500/10'
                          : 'border-gray-800 hover:bg-gray-800/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="batch"
                        value={b._id}
                        checked={batchId === b._id}
                        onChange={() => setBatchId(b._id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-100 font-mono">{b.batchNumber}</p>
                        <p className="text-[11px] text-gray-500">
                          Exp {formatDate(b.expiryDate)}{days >= 0 && days <= 60 ? <span className="text-amber-400 ml-1">· {days}d</span> : ''} ·
                          MRP {formatCurrency(b.mrp)}
                        </p>
                      </div>
                      <span className="text-sm text-gray-100 font-mono">{b.quantity}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Quantity">
                <Input type="number" min={1} max={batch?.quantity || 1} value={quantity} onChange={(v) => setQuantity(Math.max(1, Math.min(batch?.quantity || 1, Number(v) || 1)))} />
              </Field>
              <Field label="Sale Price">
                <Input type="number" step="0.01" min={0} value={unitPrice} onChange={(v) => setUnitPrice(v)} />
              </Field>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Line total: <span className="text-gray-200 font-mono">{formatCurrency((Number(unitPrice) || 0) * (Number(quantity) || 0))}</span>
            </p>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm border border-gray-700">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">
                Add to Cart
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── primitives ────────────────────────────────────────────────────────────
function Input({ value, onChange, type = 'text', className = '', ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-2.5 py-1.5 rounded-md bg-gray-950 border border-gray-800 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-red-500/50 ${className}`}
      {...rest}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2.5 py-1.5 rounded-md bg-gray-950 border border-gray-800 text-gray-100 text-sm focus:outline-none focus:border-red-500/50"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="text-[11px] text-gray-400 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-base font-bold text-white border-t border-gray-800 pt-1 mt-1' : 'text-gray-300'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
