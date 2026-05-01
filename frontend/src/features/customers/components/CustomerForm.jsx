import { memo, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { apiError } from '../../../utils/helpers';
import {
  createCustomerThunk, updateCustomerThunk, makeSelectCustomerById,
} from '../customersSlice';

const TYPES = ['walk-in', 'regular', 'chronic', 'wholesale', 'insurance', 'employee'];

const blankForm = () => ({
  customerName: '', phone: '', email: '',
  dateOfBirth: '', gender: '', customerType: 'regular', creditLimit: 0,
});

const fromCustomer = (c) => ({
  customerName: c?.customerName || '',
  phone:        c?.phone || '',
  email:        c?.email || '',
  dateOfBirth:  c?.dateOfBirth ? c.dateOfBirth.slice(0, 10) : '',
  gender:       c?.gender || '',
  customerType: c?.customerType || 'regular',
  creditLimit:  c?.creditLimit || 0,
});

function CustomerForm({ editId, onClose }) {
  const dispatch = useDispatch();
  // Subscribe only when editing — selector is null otherwise.
  const editing = useSelector((s) => (editId ? makeSelectCustomerById(editId)(s) : null));
  const [form, setForm] = useState(editing ? fromCustomer(editing) : blankForm());

  // Re-seed when the targeted customer changes
  useEffect(() => {
    setForm(editing ? fromCustomer(editing) : blankForm());
  }, [editing, editId]);

  const setField = useCallback(
    (key) => (e) => {
      const v = e.target.type === 'number'
        ? parseFloat(e.target.value) || 0
        : e.target.value;
      setForm((f) => ({ ...f, [key]: v }));
    },
    []
  );

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) return toast.error('Customer name is required');
    if (!form.phone.trim())        return toast.error('Phone number is required');

    try {
      if (editId) {
        await dispatch(updateCustomerThunk({ id: editId, payload: form })).unwrap();
        toast.success('Customer updated');
      } else {
        await dispatch(createCustomerThunk(form)).unwrap();
        toast.success('Customer added');
      }
      onClose();
    } catch (err) {
      toast.error(apiError(err, 'Failed to save customer'));
    }
  }, [dispatch, editId, form, onClose]);

  return (
    <form onSubmit={onSubmit} className="card mb-6">
      <h3 className="font-heading font-semibold text-gray-900 mb-4">
        {editId ? 'Edit' : 'New'} Customer
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Name *">
          <input className="input-field" required value={form.customerName} onChange={setField('customerName')} />
        </Field>
        <Field label="Phone *">
          <input className="input-field" required value={form.phone} onChange={setField('phone')} />
        </Field>
        <Field label="Email">
          <input type="email" className="input-field" value={form.email} onChange={setField('email')} />
        </Field>
        <Field label="Date of Birth">
          <input type="date" className="input-field" value={form.dateOfBirth} onChange={setField('dateOfBirth')} />
        </Field>
        <Field label="Gender">
          <select className="input-field" value={form.gender} onChange={setField('gender')}>
            <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
          </select>
        </Field>
        <Field label="Type">
          <select className="input-field" value={form.customerType} onChange={setField('customerType')}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Credit Limit">
          <input type="number" className="input-field" value={form.creditLimit} onChange={setField('creditLimit')} />
        </Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

export default memo(CustomerForm);
