import { memo, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { apiError } from '../../../utils/helpers';
import Field from '../../../shared/components/Field';
import { createSupplierThunk, updateSupplierThunk, makeSelectSupplierById } from '../suppliersSlice';

const TERMS = ['COD', 'Credit 15', 'Credit 30', 'Credit 60', 'Credit 90'];
const blankForm = () => ({
  supplierName: '', companyName: '', phone: '', email: '',
  city: '', drugLicenseNumber: '', dlExpiryDate: '',
  paymentTerms: 'COD', creditLimit: 0, contactPerson: '', notes: '',
});
const fromSupplier = (s) => ({
  supplierName: s?.supplierName || '',
  companyName:  s?.companyName  || '',
  phone:        s?.phone        || '',
  email:        s?.email        || '',
  city:         s?.address?.city || '',
  drugLicenseNumber: s?.drugLicenseNumber || '',
  dlExpiryDate: s?.dlExpiryDate ? s.dlExpiryDate.split('T')[0] : '',
  paymentTerms: s?.paymentTerms || 'COD',
  creditLimit:  s?.creditLimit  || 0,
  contactPerson: s?.contactPerson || '',
  notes:        s?.notes || '',
});

function SupplierForm({ editId, onClose }) {
  const dispatch = useDispatch();
  const editing = useSelector((s) => (editId ? makeSelectSupplierById(editId)(s) : null));
  const [form, setForm] = useState(editing ? fromSupplier(editing) : blankForm());

  useEffect(() => { setForm(editing ? fromSupplier(editing) : blankForm()); }, [editing, editId]);

  const setField = useCallback((k) => (e) => {
    const v = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    const payload = { ...form, address: { city: form.city } };
    try {
      if (editId) {
        await dispatch(updateSupplierThunk({ id: editId, payload })).unwrap();
        toast.success('Supplier updated');
      } else {
        await dispatch(createSupplierThunk(payload)).unwrap();
        toast.success('Supplier added');
      }
      onClose();
    } catch (err) { toast.error(apiError(err)); }
  }, [dispatch, editId, form, onClose]);

  return (
    <form onSubmit={onSubmit} className="card mb-6">
      <h3 className="font-heading font-semibold text-gray-900 mb-4">{editId ? 'Edit Supplier' : 'New Supplier'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Supplier Name" required><input className="input-field" required value={form.supplierName} onChange={setField('supplierName')} /></Field>
        <Field label="Company"><input className="input-field" value={form.companyName} onChange={setField('companyName')} /></Field>
        <Field label="Phone" required><input className="input-field" required value={form.phone} onChange={setField('phone')} /></Field>
        <Field label="Email"><input type="email" className="input-field" value={form.email} onChange={setField('email')} /></Field>
        <Field label="City"><input className="input-field" value={form.city} onChange={setField('city')} /></Field>
        <Field label="Contact Person"><input className="input-field" value={form.contactPerson} onChange={setField('contactPerson')} /></Field>
        <Field label="Drug License #"><input className="input-field" value={form.drugLicenseNumber} onChange={setField('drugLicenseNumber')} /></Field>
        <Field label="DL Expiry"><input type="date" className="input-field" value={form.dlExpiryDate} onChange={setField('dlExpiryDate')} /></Field>
        <Field label="Payment Terms">
          <select className="input-field" value={form.paymentTerms} onChange={setField('paymentTerms')}>
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Credit Limit (Rs.)"><input type="number" className="input-field" value={form.creditLimit} onChange={setField('creditLimit')} /></Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default memo(SupplierForm);
