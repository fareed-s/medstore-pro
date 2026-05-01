import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { apiError, formatCurrency } from '../../utils/helpers';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlineSave, HiOutlineSearch, HiOutlineX,
} from 'react-icons/hi';

// Punching screen for fast stock receipt — like the legacy desktop POS apps:
// each row captures one supplier-invoice line, scan/type a barcode in the
// "Code" cell to auto-fill the medicine, then tab through the rest.

const blankRow = () => ({
  id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  code: '',
  medicineId: '',
  medicineName: '',
  batchNumber: '',
  costPrice: '',
  salePrice: '',
  taxRate: '',
  discountPercent: '',
  quantity: '',
  bonusQuantity: '',
  expiryDate: '',
  // ux state
  looking: false,
  error: '',
});

// Per-row totals: gross = qty × cost; discount on gross; tax on the discounted
// amount. Bonus quantities are free units, so they don't add to cost.
function computeTotals(r) {
  const cost = parseFloat(r.costPrice) || 0;
  const qty  = parseInt(r.quantity)    || 0;
  const disc = parseFloat(r.discountPercent) || 0;
  const tax  = parseFloat(r.taxRate)         || 0;
  const gross = cost * qty;
  const discAmt = gross * (disc / 100);
  const taxable = gross - discAmt;
  const taxAmt = taxable * (tax / 100);
  return {
    gross,
    net: +(taxable + taxAmt).toFixed(2),
  };
}

export default function QuickStockInPage() {
  const [rows, setRows] = useState([blankRow(), blankRow(), blankRow()]);
  const [saving, setSaving] = useState(false);
  // Picker modal: when user clicks "Search by name" in a row's Code cell.
  const [pickerForRow, setPickerForRow] = useState(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerResults, setPickerResults] = useState([]);
  const codeRefs = useRef({}); // id → input element

  // Keep at least one empty row at the end so users never have to click "+".
  useEffect(() => {
    const last = rows[rows.length - 1];
    if (last && (last.code || last.medicineId)) {
      setRows((rs) => [...rs, blankRow()]);
    }
  }, [rows]);

  const setRow = (id, patch) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : [blankRow()]));

  const addRow = () => setRows((rs) => [...rs, blankRow()]);

  // Look up a medicine by barcode, then merge its known prices into the row.
  const lookupCode = async (id, code) => {
    if (!code) return;
    setRow(id, { looking: true, error: '' });
    try {
      const { data } = await API.get(`/medicines/barcode/${encodeURIComponent(code)}`);
      const m = data.data;
      setRow(id, {
        looking: false,
        error: '',
        medicineId: m._id,
        medicineName: m.medicineName,
        // Pre-fill prices from medicine record so user only types what changed.
        costPrice: m.costPrice ? String(m.costPrice) : '',
        salePrice: m.salePrice ? String(m.salePrice) : '',
        taxRate: m.taxRate != null ? String(m.taxRate) : '',
      });
    } catch (err) {
      setRow(id, { looking: false, error: 'Not found' });
      toast.warning(`Barcode "${code}" not found in your medicines`);
    }
  };

  const handleCodeKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      lookupCode(id, e.currentTarget.value.trim());
    }
  };

  // Search-by-name modal — debounced lookup against /medicines/search
  useEffect(() => {
    if (!pickerForRow) return;
    if (pickerQuery.length < 2) { setPickerResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await API.get(`/medicines/search?q=${encodeURIComponent(pickerQuery)}&limit=15`);
        setPickerResults(data.data);
      } catch { /* swallow */ }
    }, 200);
    return () => clearTimeout(t);
  }, [pickerQuery, pickerForRow]);

  const choosePickerResult = (m) => {
    if (!pickerForRow) return;
    setRow(pickerForRow, {
      code: m.barcode || '',
      medicineId: m._id,
      medicineName: m.medicineName,
      costPrice: m.costPrice ? String(m.costPrice) : '',
      salePrice: m.salePrice ? String(m.salePrice) : '',
      taxRate: m.taxRate != null ? String(m.taxRate) : '',
      error: '',
    });
    setPickerForRow(null);
    setPickerQuery('');
    setPickerResults([]);
  };

  // Validate then post. Errors return per-row; we keep the rows and surface
  // the messages inline.
  const handleSave = async () => {
    const filled = rows.filter((r) => r.medicineId || r.code || r.batchNumber || r.quantity);
    if (!filled.length) { toast.error('Add at least one row'); return; }

    // Mark client-side issues before POST
    const cleaned = filled.map((r) => ({ ...r, error: '' }));
    let ok = true;
    for (const r of cleaned) {
      if (!r.medicineId)  { r.error = 'Pick a medicine (scan code or use search)'; ok = false; continue; }
      if (!r.batchNumber) { r.error = 'Batch number required'; ok = false; continue; }
      if (!r.expiryDate)  { r.error = 'Expiry date required'; ok = false; continue; }
      const qty = parseInt(r.quantity) || 0;
      if (qty <= 0)       { r.error = 'Quantity > 0'; ok = false; continue; }
    }
    if (!ok) {
      // Re-merge errors back so the UI shows them
      setRows((rs) => rs.map((r) => {
        const c = cleaned.find((x) => x.id === r.id);
        return c ? { ...r, error: c.error } : r;
      }));
      toast.error('Please fix the highlighted rows');
      return;
    }

    setSaving(true);
    try {
      const payload = cleaned.map((r) => ({
        medicineId: r.medicineId,
        batchNumber: r.batchNumber,
        costPrice: r.costPrice,
        salePrice: r.salePrice,
        mrp: r.salePrice, // user only enters one selling price; mirror to MRP for now
        taxRate: r.taxRate,
        discountPercent: r.discountPercent,
        quantity: r.quantity,
        bonusQuantity: r.bonusQuantity,
        expiryDate: r.expiryDate,
      }));
      const { data } = await API.post('/batches/quick-stock-in', { rows: payload });
      if (data.errors?.length) {
        // Show partial success
        toast.warning(`${data.created} saved · ${data.errors.length} failed`);
        // Map back errors to row ids by index of `cleaned`
        setRows((rs) => rs.map((r) => {
          const idx = cleaned.findIndex((x) => x.id === r.id);
          if (idx === -1) return r;
          const e = data.errors.find((x) => x.row === idx + 1);
          return e ? { ...r, error: e.error } : r;
        }));
      } else {
        toast.success(`Saved ${data.created} batch${data.created === 1 ? '' : 'es'}`);
        setRows([blankRow(), blankRow(), blankRow()]);
      }
    } catch (err) {
      toast.error(apiError(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const grand = useMemo(() => {
    return rows.reduce((sum, r) => sum + computeTotals(r).net, 0);
  }, [rows]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Quick Stock In</h1>
          <p className="text-gray-500 text-sm">
            Scan or type a barcode in the <b>Code</b> cell — name + prices auto-fill. Press Enter after scanning.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={addRow} className="btn-secondary flex items-center gap-1.5">
            <HiOutlinePlus className="w-4 h-4" /> Add Row
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
            <HiOutlineSave className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-primary-700 text-white text-xs uppercase tracking-wider">
            <tr>
              <th className="px-2 py-2.5 w-10 text-left">#</th>
              <th className="px-2 py-2.5 w-36 text-left">Code</th>
              <th className="px-2 py-2.5 text-left">Name</th>
              <th className="px-2 py-2.5 w-28 text-left">Batch</th>
              <th className="px-2 py-2.5 w-24 text-right">Cost</th>
              <th className="px-2 py-2.5 w-24 text-right">Sale</th>
              <th className="px-2 py-2.5 w-20 text-right">Tax %</th>
              <th className="px-2 py-2.5 w-20 text-right">Disc %</th>
              <th className="px-2 py-2.5 w-20 text-right">Qty</th>
              <th className="px-2 py-2.5 w-20 text-right">Bonus</th>
              <th className="px-2 py-2.5 w-36 text-left">Expiry</th>
              <th className="px-2 py-2.5 w-28 text-right">Total</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, idx) => {
              const t = computeTotals(r);
              const hasError = !!r.error;
              return (
                <tr key={r.id} className={`${idx % 2 ? 'bg-gray-50/40' : ''} ${hasError ? 'bg-red-50/60' : ''}`}>
                  <td className="px-2 py-1.5 text-center text-gray-400 text-xs">{idx + 1}</td>

                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        ref={(el) => { if (el) codeRefs.current[r.id] = el; }}
                        className={`cell-input ${r.looking ? 'ring-2 ring-primary-300' : ''} ${r.error === 'Not found' ? 'border-red-400' : ''}`}
                        placeholder="Scan / type"
                        value={r.code}
                        onChange={(e) => setRow(r.id, { code: e.target.value, error: '' })}
                        onKeyDown={(e) => handleCodeKeyDown(e, r.id)}
                        onBlur={(e) => {
                          // If user typed a code but didn't press Enter, lookup on blur too
                          if (e.target.value && !r.medicineId) lookupCode(r.id, e.target.value.trim());
                        }}
                      />
                      <button
                        type="button"
                        title="Search by name"
                        onClick={() => { setPickerForRow(r.id); setPickerQuery(''); }}
                        className="p-1.5 rounded-md text-gray-400 hover:bg-primary-50 hover:text-primary-600">
                        <HiOutlineSearch className="w-4 h-4" />
                      </button>
                    </div>
                  </td>

                  <td className="px-2 py-1.5">
                    <div className="text-gray-900 font-medium truncate" title={r.medicineName}>
                      {r.medicineName || <span className="text-gray-300">—</span>}
                    </div>
                    {r.error && <p className="text-[10px] text-red-500">{r.error}</p>}
                  </td>

                  <td className="px-2 py-1.5">
                    <input className="cell-input"
                      value={r.batchNumber}
                      onChange={(e) => setRow(r.id, { batchNumber: e.target.value })} />
                  </td>

                  <NumCell value={r.costPrice}        onChange={(v) => setRow(r.id, { costPrice: v })} />
                  <NumCell value={r.salePrice}        onChange={(v) => setRow(r.id, { salePrice: v })} />
                  <NumCell value={r.taxRate}          onChange={(v) => setRow(r.id, { taxRate: v })} />
                  <NumCell value={r.discountPercent}  onChange={(v) => setRow(r.id, { discountPercent: v })} />
                  <NumCell value={r.quantity}         onChange={(v) => setRow(r.id, { quantity: v })} />
                  <NumCell value={r.bonusQuantity}    onChange={(v) => setRow(r.id, { bonusQuantity: v })} />

                  <td className="px-2 py-1.5">
                    <input type="date" className="cell-input"
                      value={r.expiryDate}
                      onChange={(e) => setRow(r.id, { expiryDate: e.target.value })} />
                  </td>

                  <td className="px-2 py-1.5 text-right">
                    <p className="font-semibold text-gray-900">{t.net ? formatCurrency(t.net) : '—'}</p>
                    {t.gross !== t.net && t.gross > 0 && (
                      <p className="text-[10px] text-gray-400">gross {formatCurrency(t.gross)}</p>
                    )}
                  </td>

                  <td className="text-center">
                    <button onClick={() => removeRow(r.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-md">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={11} className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-gray-500 font-semibold">
                Grand Total
              </td>
              <td className="px-2 py-2.5 text-right font-heading font-bold text-base text-primary-700">
                {formatCurrency(grand)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Inline cell-input style — narrow & compact, mirrors a punch screen */}
      <style>{`
        .cell-input {
          width: 100%;
          padding: 4px 8px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 13px;
          background: white;
          outline: none;
        }
        .cell-input:focus { border-color: var(--tw-ring-color, #16a34a); box-shadow: 0 0 0 2px #bbf7d0; }
      `}</style>

      {/* Search-by-name modal */}
      {pickerForRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-20"
          onClick={() => setPickerForRow(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <HiOutlineSearch className="w-4 h-4 text-gray-400" />
              <input
                autoFocus
                className="flex-1 outline-none text-sm"
                placeholder="Search medicine by name, generic, SKU…"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
              />
              <button onClick={() => setPickerForRow(null)} className="p-1 hover:bg-gray-100 rounded">
                <HiOutlineX className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {pickerResults.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">
                  {pickerQuery.length < 2 ? 'Type at least 2 characters…' : 'No matches'}
                </p>
              ) : pickerResults.map((m) => (
                <button key={m._id} onClick={() => choosePickerResult(m)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-primary-50 text-left border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.medicineName}</p>
                    <p className="text-xs text-gray-400">{m.genericName || '—'}{m.barcode ? ` · ${m.barcode}` : ''}</p>
                  </div>
                  <span className="text-xs text-gray-500">Stock: {m.currentStock ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NumCell({ value, onChange }) {
  return (
    <td className="px-2 py-1.5">
      <input type="number" min="0" step="0.01" className="cell-input text-right"
        value={value}
        onChange={(e) => onChange(e.target.value)} />
    </td>
  );
}
