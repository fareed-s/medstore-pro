import { memo, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { apiError } from '../../../utils/helpers';
import Field from '../../../shared/components/Field';
import { createExpenseThunk, fetchExpensesSummary } from '../expensesSlice';

const CATEGORIES = ['Rent','Salaries','Electricity','Transport','Maintenance','Packaging','Marketing','License Fees','Insurance Premium','Telephone','Internet','Stationery','Cleaning','Miscellaneous'];
const PAYMENT = [['cash','Cash'],['card','Card'],['bank_transfer','Bank'],['cheque','Cheque']];

const blankForm = () => ({
  category: 'Miscellaneous', amount: '', description: '',
  paymentMethod: 'cash', date: new Date().toISOString().slice(0, 10),
});

function ExpenseForm({ onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState(blankForm());

  const setField = useCallback((k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  }, []);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      await dispatch(createExpenseThunk({ ...form, amount: parseFloat(form.amount) })).unwrap();
      dispatch(fetchExpensesSummary());
      toast.success('Expense recorded');
      onClose();
    } catch (err) { toast.error(apiError(err)); }
  }, [dispatch, form, onClose]);

  return (
    <form onSubmit={onSubmit} className="card mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Field label="Category" required>
          <select className="input-field text-sm" value={form.category} onChange={setField('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Amount" required>
          <input type="number" step="0.01" className="input-field" required value={form.amount} onChange={setField('amount')} />
        </Field>
        <Field label="Description" required>
          <input className="input-field" required value={form.description} onChange={setField('description')} />
        </Field>
        <Field label="Payment">
          <select className="input-field text-sm" value={form.paymentMethod} onChange={setField('paymentMethod')}>
            {PAYMENT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" className="input-field" value={form.date} onChange={setField('date')} />
        </Field>
      </div>
      <div className="flex gap-2 mt-3">
        <button type="submit" className="btn-primary text-sm">Save</button>
        <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
      </div>
    </form>
  );
}

export default memo(ExpenseForm);
