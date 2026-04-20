import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CATEGORIES = ['Rent', 'Salaries', 'Electricity', 'Transport', 'Maintenance', 'Packaging', 'Marketing', 'License Fees', 'Insurance Premium', 'Telephone', 'Internet', 'Stationery', 'Cleaning', 'Miscellaneous'];
const COLORS = ['#059669', '#10b981', '#34d399', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#a855f7', '#64748b'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'Miscellaneous', amount: '', description: '', paymentMethod: 'cash', date: new Date().toISOString().split('T')[0] });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, sumRes] = await Promise.all([
        API.get('/finance/expenses'),
        API.get('/finance/expenses/summary'),
      ]);
      setExpenses(expRes.data.data);
      setSummary(sumRes.data.data);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/finance/expenses', { ...form, amount: parseFloat(form.amount) });
      toast.success('Expense recorded');
      setForm({ category: 'Miscellaneous', amount: '', description: '', paymentMethod: 'cash', date: new Date().toISOString().split('T')[0] });
      setShowForm(false); fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await API.delete(`/finance/expenses/${id}`); fetchData(); toast.success('Deleted'); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Expenses</h1><p className="text-gray-500 text-sm">Total: {formatCurrency(summary?.total || 0)}</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><HiOutlinePlus className="w-4 h-4" /> Add Expense</button>
      </div>

      {/* Summary */}
      {summary?.byCategory?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="card">
            <h3 className="font-heading font-semibold text-gray-900 mb-3">By Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={summary.byCategory.map(c => ({ name: c._id, value: c.total }))} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                  {summary.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-heading font-semibold text-gray-900 mb-3">Breakdown</h3>
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {summary.byCategory.map((c, i) => (
                <div key={c._id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 text-sm">{c._id}</span>
                  <span className="text-sm font-medium">{formatCurrency(c.total)}</span>
                  <span className="text-xs text-gray-400">{c.count}x</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div><label className="label">Category *</label><select className="input-field text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label">Amount *</label><input type="number" step="0.01" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div><label className="label">Description *</label><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
            <div><label className="label">Payment</label><select className="input-field text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank</option><option value="cheque">Cheque</option></select></div>
            <div><label className="label">Date</label><input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-3"><button type="submit" className="btn-primary text-sm">Save</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button></div>
        </form>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 hidden md:table-cell">Method</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 hidden md:table-cell">By</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map(exp => (
                <tr key={exp._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2 text-xs text-gray-500">{formatDate(exp.date)}</td>
                  <td className="px-4 py-2"><span className="badge badge-gray text-[10px]">{exp.category}</span></td>
                  <td className="px-4 py-2 text-gray-700">{exp.description}</td>
                  <td className="px-4 py-2 hidden md:table-cell text-xs text-gray-400">{exp.paymentMethod}</td>
                  <td className="px-4 py-2 text-right font-bold text-red-600">{formatCurrency(exp.amount)}</td>
                  <td className="px-4 py-2 hidden md:table-cell text-xs text-gray-400">{exp.addedBy?.name}</td>
                  <td className="px-4 py-2"><button onClick={() => deleteExpense(exp._id)} className="p-1 hover:bg-red-50 rounded"><HiOutlineTrash className="w-3.5 h-3.5 text-red-400" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
