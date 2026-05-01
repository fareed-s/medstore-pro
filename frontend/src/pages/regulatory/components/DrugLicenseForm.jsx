import { memo, useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../../utils/api';
import { apiError } from '../../../utils/helpers';
import Field from '../../../shared/components/Field';
import { DL_TYPES } from './DL_TYPES';

const blank = () => ({
  type: 'store_retail', licenseNumber: '', issuedTo: '', issuedBy: '',
  issueDate: '', expiryDate: '', notes: '',
});

function DrugLicenseForm({ onSaved, onClose }) {
  const [form, setForm] = useState(blank());

  const setField = useCallback((k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value })), []);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      await API.post('/regulatory/licenses', form);
      toast.success('License added');
      setForm(blank());
      onSaved?.();
      onClose();
    } catch (err) { toast.error(apiError(err)); }
  }, [form, onSaved, onClose]);

  return (
    <form onSubmit={onSubmit} className="card mb-4">
      <h3 className="font-heading font-semibold text-gray-900 mb-3">Add Drug License</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Type" required>
          <select className="input-field" value={form.type} onChange={setField('type')}>
            {DL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="License Number" required>
          <input className="input-field" required value={form.licenseNumber} onChange={setField('licenseNumber')} />
        </Field>
        <Field label="Issued To"><input className="input-field" value={form.issuedTo} onChange={setField('issuedTo')} /></Field>
        <Field label="Issued By"><input className="input-field" value={form.issuedBy} onChange={setField('issuedBy')} /></Field>
        <Field label="Issue Date"><input type="date" className="input-field" value={form.issueDate} onChange={setField('issueDate')} /></Field>
        <Field label="Expiry Date" required>
          <input type="date" className="input-field" required value={form.expiryDate} onChange={setField('expiryDate')} />
        </Field>
      </div>
      <div className="flex gap-2 mt-3">
        <button type="submit" className="btn-primary">Save</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default memo(DrugLicenseForm);
