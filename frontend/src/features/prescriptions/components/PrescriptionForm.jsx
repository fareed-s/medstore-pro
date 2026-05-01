import { memo, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { apiError } from '../../../utils/helpers';
import Field from '../../../shared/components/Field';
import { createPrescriptionThunk } from '../prescriptionsSlice';
import { searchCustomers } from '../prescriptionsService';

const blankLine = () => ({ medicineName: '', dosage: '', frequency: '', duration: '', quantity: '' });
const blankForm = () => ({
  customerId: '', customerName: '', doctorName: '',
  doctorRegistration: '', doctorSpecialty: '', diagnosis: '',
  medicines: [blankLine()],
});

function PrescriptionForm({ onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState(blankForm());
  const [custQuery, setCustQuery] = useState('');
  const [custResults, setCustResults] = useState([]);

  const onCustQueryChange = useCallback(async (e) => {
    const q = e.target.value;
    setCustQuery(q);
    if (q.length >= 2) {
      try { setCustResults(await searchCustomers(q)); }
      catch { setCustResults([]); }
    } else {
      setCustResults([]);
    }
  }, []);

  const pickCustomer = useCallback((c) => {
    setForm((f) => ({ ...f, customerId: c._id, customerName: c.customerName }));
    setCustQuery(c.customerName);
    setCustResults([]);
  }, []);

  const setHeaderField = useCallback((k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  }, []);

  const updateLine = useCallback((idx, key, val) => {
    setForm((f) => ({ ...f, medicines: f.medicines.map((m, i) => i === idx ? { ...m, [key]: val } : m) }));
  }, []);

  const addLine    = useCallback(() => setForm((f) => ({ ...f, medicines: [...f.medicines, blankLine()] })), []);
  const removeLine = useCallback((idx) => setForm((f) => ({ ...f, medicines: f.medicines.filter((_, i) => i !== idx) })), []);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!form.customerId) return toast.error('Select a customer');
    if (!form.doctorName) return toast.error('Doctor name required');
    try {
      await dispatch(createPrescriptionThunk(form)).unwrap();
      toast.success('Prescription saved');
      onClose();
    } catch (err) { toast.error(apiError(err)); }
  }, [dispatch, form, onClose]);

  return (
    <form onSubmit={onSubmit} className="card mb-6">
      <h3 className="font-heading font-semibold text-gray-900 mb-4">New Prescription</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="relative">
          <Field label="Customer" required>
            <input className="input-field" placeholder="Search customer..."
              value={custQuery} onChange={onCustQueryChange} />
          </Field>
          {custResults.length > 0 && custQuery.length >= 2 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border max-h-40 overflow-y-auto">
              {custResults.map((c) => (
                <button key={c._id} type="button" onClick={() => pickCustomer(c)}
                  className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm border-b">
                  {c.customerName} — {c.phone}
                </button>
              ))}
            </div>
          )}
        </div>
        <Field label="Doctor Name" required>
          <input className="input-field" required value={form.doctorName} onChange={setHeaderField('doctorName')} />
        </Field>
        <Field label="Doctor Registration">
          <input className="input-field" value={form.doctorRegistration} onChange={setHeaderField('doctorRegistration')} />
        </Field>
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Prescribed Medicines</label>
          <button type="button" onClick={addLine} className="text-primary-600 text-sm font-medium hover:underline">+ Add Line</button>
        </div>
        {form.medicines.map((m, idx) => (
          <div key={idx} className="flex gap-2 mb-2 items-end">
            <input className="input-field flex-[2] text-sm" placeholder="Medicine name"
              value={m.medicineName} onChange={(e) => updateLine(idx, 'medicineName', e.target.value)} />
            <input className="input-field w-24 text-sm" placeholder="Dosage"
              value={m.dosage} onChange={(e) => updateLine(idx, 'dosage', e.target.value)} />
            <input className="input-field w-28 text-sm" placeholder="Frequency"
              value={m.frequency} onChange={(e) => updateLine(idx, 'frequency', e.target.value)} />
            <input className="input-field w-20 text-sm" placeholder="Days"
              value={m.duration} onChange={(e) => updateLine(idx, 'duration', e.target.value)} />
            <input type="number" className="input-field w-16 text-sm" placeholder="Qty"
              value={m.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
            {form.medicines.length > 1 && (
              <button type="button" onClick={() => removeLine(idx)} className="p-1 text-red-400 hover:bg-red-50 rounded">✕</button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">Save Prescription</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default memo(PrescriptionForm);
