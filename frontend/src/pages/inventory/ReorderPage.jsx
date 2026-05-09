// Reorder suggestions — medicines at or below reorder level. Now with
// "Create PO" flow: tick the rows to include, pick a supplier, and a
// draft Purchase Order is created in one click. Saves the operator from
// re-typing every line on the PO form.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../../utils/api';
import { apiError, formatCurrency } from '../../utils/helpers';
import {
  HiOutlineShoppingCart, HiOutlineExclamation, HiOutlineDocumentAdd,
  HiOutlineX, HiOutlineCheck,
} from 'react-icons/hi';
import Spinner from '../../shared/components/Spinner';

const URGENCY = { critical: 'badge-red', high: 'badge-amber', medium: 'badge-blue' };

export default function ReorderPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());      // medicineId set
  const [showPOModal, setShowPOModal] = useState(false);

  useEffect(() => {
    API.get('/inventory-v2/reorder-suggestions')
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (!data?.items) return;
    if (selected.size === data.items.length) setSelected(new Set());
    else setSelected(new Set(data.items.map((m) => m._id)));
  };

  const selectedItems = useMemo(
    () => (data?.items || []).filter((m) => selected.has(m._id)),
    [data, selected]
  );

  if (loading) return <Spinner size="lg" padding="lg" />;

  const totalSelected = selectedItems.reduce((s, m) => s + m.estimatedCost, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Reorder Suggestions</h1>
          <p className="text-gray-500 text-sm">Products at or below reorder level</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => setShowPOModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <HiOutlineDocumentAdd className="w-4 h-4" />
            Create PO ({selected.size}) · {formatCurrency(totalSelected)}
          </button>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
          <SummaryStat icon={HiOutlineShoppingCart} bg="bg-amber-50" color="text-amber-600" label="Need Reorder" value={data.summary.count} />
          <SummaryStat icon={HiOutlineExclamation}  bg="bg-red-50"   color="text-red-600"   label="Critical (0 stock)" value={data.summary.critical}     valueColor="text-red-600" />
          <SummaryStat icon={HiOutlineExclamation}  bg="bg-amber-50" color="text-amber-600" label="High Priority"      value={data.summary.high}         valueColor="text-amber-600" />
          <div className="card text-center py-3">
            <p className="text-xs text-gray-500">Est. Reorder Cost</p>
            <p className="text-xl font-heading font-bold text-primary-600">{formatCurrency(data.summary.totalEstimatedCost)}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {data?.items?.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="font-medium">All stock levels are healthy!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size > 0 && selected.size === data?.items?.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Current</th>
                  <th className="px-4 py-3 text-center">Reorder Level</th>
                  <th className="px-4 py-3 text-center">Suggested Qty</th>
                  <th className="px-4 py-3 text-right">Est. Cost</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Rack</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.items?.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => toggle(item._id)}
                    className={`hover:bg-gray-50/50 cursor-pointer ${
                      item.urgency === 'critical' ? 'bg-red-50/30' : ''
                    } ${selected.has(item._id) ? 'bg-primary-50/40' : ''}`}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(item._id)}
                        onChange={() => toggle(item._id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-xs">{item.medicineName}</p>
                      <p className="text-[10px] text-gray-400">{item.genericName} • {item.manufacturer}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${item.currentStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>{item.currentStock}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.reorderLevel}</td>
                    <td className="px-4 py-3 text-center font-semibold text-primary-600">{item.suggestedQty}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.estimatedCost)}</td>
                    <td className="px-4 py-3"><span className={`badge ${URGENCY[item.urgency]}`}>{item.urgency}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{item.rackLocation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPOModal && (
        <CreatePOModal
          items={selectedItems}
          onClose={() => setShowPOModal(false)}
          onCreated={(po) => {
            setShowPOModal(false);
            setSelected(new Set());
            navigate(`/purchase/orders/${po._id}`);
          }}
        />
      )}
    </div>
  );
}

// ─── Modal: pick supplier + tweak quantities + submit ──────────────────────
function CreatePOModal({ items, onClose, onCreated }) {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('Auto-generated from reorder suggestions');
  const [lines, setLines] = useState(
    items.map((m) => ({
      medicineId: m._id, medicineName: m.medicineName,
      quantity: m.suggestedQty, unitCost: m.costPrice || 0,
    }))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/purchase/suppliers').then((r) => setSuppliers(r.data.data || [])).catch(() => {});
  }, []);

  const total = lines.reduce((s, l) => s + (l.quantity * l.unitCost), 0);

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    if (!supplierId) { toast.error('Pick a supplier'); return; }
    const valid = lines.filter((l) => l.quantity > 0);
    if (valid.length === 0) { toast.error('At least one line with quantity > 0'); return; }
    setSaving(true);
    try {
      const { data } = await API.post('/purchase/orders', {
        supplierId,
        items: valid.map((l) => ({
          medicineId: l.medicineId,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost),
        })),
        notes,
      });
      toast.success(`Draft PO created — ${data.data.poNumber}`);
      onCreated(data.data);
    } catch (err) {
      toast.error(apiError(err, 'Failed to create PO'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl my-4 sm:my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-lg">Create Draft Purchase Order</h3>
            <p className="text-xs text-gray-500">{lines.length} item(s) selected · You can review on the PO page before sending</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><HiOutlineX className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label">Supplier <span className="text-red-500">*</span></label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="input-field"
              required
            >
              <option value="">— pick supplier —</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.supplierName}{s.companyName ? ` · ${s.companyName}` : ''}
                </option>
              ))}
            </select>
            {suppliers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1.5">
                No suppliers found — add a supplier first under Purchase → Suppliers.
              </p>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Medicine</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-center w-24">Qty</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right w-28">Unit Cost</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right w-28">Line Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((l, i) => (
                  <tr key={l.medicineId}>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[200px]">{l.medicineName}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number" min={0} value={l.quantity}
                        onChange={(e) => updateLine(i, { quantity: Number(e.target.value) || 0 })}
                        className="input-field py-1 px-2 text-sm text-center"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number" min={0} step="0.01" value={l.unitCost}
                        onChange={(e) => updateLine(i, { unitCost: Number(e.target.value) || 0 })}
                        className="input-field py-1 px-2 text-sm text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700">
                      {formatCurrency(l.quantity * l.unitCost)}
                    </td>
                    <td className="px-2">
                      <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 p-1">
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-6 text-gray-400">All lines removed</td></tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right">Subtotal</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div>
            <label className="label">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              placeholder="optional"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              PO will be saved as <b>draft</b> — review on the PO page before issuing.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={saving || !supplierId || lines.length === 0} className="btn-primary text-sm flex items-center gap-1.5">
                <HiOutlineCheck className="w-4 h-4" /> {saving ? 'Creating…' : 'Create Draft PO'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, bg, color, label, value, valueColor }) {
  return (
    <div className="stat-card">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-xl font-heading font-bold ${valueColor || ''}`}>{value}</p>
      </div>
    </div>
  );
}
