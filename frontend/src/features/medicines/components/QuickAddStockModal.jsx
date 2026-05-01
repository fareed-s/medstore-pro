import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { HiOutlineX } from 'react-icons/hi';
import API from '../../../utils/api';
import { apiError } from '../../../utils/helpers';
import { fetchMedicines, selectMedicinesFilters } from '../medicinesSlice';

// Quick "Add Stock" modal launched from a row in the medicines list, so the
// user can add a batch without leaving the table.  Mirrors the Add Batch form
// on MedicineDetailPage but pre-fills prices from the medicine record.
export default function QuickAddStockModal({ medicine, onClose }) {
  const dispatch = useDispatch();
  const filters  = useSelector(selectMedicinesFilters);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batchNumber: '',
    expiryDate: '',
    quantity: '',
    costPrice: medicine.costPrice ?? '',
    salePrice: medicine.salePrice ?? '',
    mrp:       medicine.mrp       ?? '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.batchNumber.trim()) { toast.error('Batch number required'); return; }
    if (!form.expiryDate)         { toast.error('Expiry date required');  return; }
    const qty = parseInt(form.quantity, 10) || 0;
    if (qty <= 0)                 { toast.error('Quantity must be > 0');  return; }

    setSaving(true);
    try {
      await API.post('/batches', {
        medicineId:  medicine._id,
        batchNumber: form.batchNumber.trim(),
        expiryDate:  form.expiryDate,
        quantity:    qty,
        costPrice:   parseFloat(form.costPrice) || 0,
        salePrice:   parseFloat(form.salePrice) || 0,
        mrp:         parseFloat(form.mrp)       || 0,
      });
      toast.success(`Added ${qty} units of ${medicine.medicineName}`);
      dispatch(fetchMedicines(filters));
      onClose();
    } catch (err) {
      toast.error(apiError(err, 'Failed to add stock'));
    } finally {
      setSaving(false);
    }
  };

  const projected = (medicine.currentStock || 0) + (parseInt(form.quantity, 10) || 0);

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-heading font-bold text-gray-900">Add Stock</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{medicine.medicineName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Close">
            <HiOutlineX className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Batch Number *</label>
              <input className="input-field" value={form.batchNumber} onChange={set('batchNumber')} autoFocus required />
            </div>
            <div>
              <label className="label">Expiry Date *</label>
              <input type="date" className="input-field" value={form.expiryDate} onChange={set('expiryDate')} required />
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input type="number" min="1" className="input-field" value={form.quantity} onChange={set('quantity')} required />
            </div>
            <div>
              <label className="label">Cost Price</label>
              <input type="number" step="0.01" className="input-field" value={form.costPrice} onChange={set('costPrice')} />
            </div>
            <div>
              <label className="label">Sale Price</label>
              <input type="number" step="0.01" className="input-field" value={form.salePrice} onChange={set('salePrice')} />
            </div>
            <div>
              <label className="label">MRP</label>
              <input type="number" step="0.01" className="input-field" value={form.mrp} onChange={set('mrp')} />
            </div>
          </div>

          <div className="bg-primary-50 rounded-lg p-3 mt-4 text-xs text-primary-700">
            Current stock: <span className="font-bold">{medicine.currentStock || 0}</span>
            <span className="mx-2">·</span>
            After adding: <span className="font-bold">{projected}</span>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Adding…' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
