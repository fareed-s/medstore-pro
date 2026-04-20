import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlineCash, HiOutlineLockOpen, HiOutlineLockClosed } from 'react-icons/hi';

export default function CashRegisterPage() {
  const [register, setRegister] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [txForm, setTxForm] = useState({ type: 'cash_out', category: '', amount: '', description: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [regRes, histRes] = await Promise.all([
        API.get('/finance/register'),
        API.get('/finance/register/history'),
      ]);
      setRegister(regRes.data.data);
      setHistory(histRes.data.data);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const openRegister = async () => {
    try {
      await API.post('/finance/register/open', { openingBalance: parseFloat(openingBalance) || 0 });
      toast.success('Cash register opened');
      setOpeningBalance(''); fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const closeRegister = async () => {
    if (!closingBalance) return toast.error('Enter actual closing balance');
    try {
      await API.post('/finance/register/close', { closingBalance: parseFloat(closingBalance), notes: closingNotes });
      toast.success('Register closed');
      setClosingBalance(''); setClosingNotes(''); fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const addTx = async (e) => {
    e.preventDefault();
    try {
      await API.post('/finance/register/transaction', { ...txForm, amount: parseFloat(txForm.amount) });
      toast.success('Transaction recorded');
      setTxForm({ type: 'cash_out', category: '', amount: '', description: '' }); fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const expected = register ? register.openingBalance + register.cashIn - register.cashOut : 0;

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Cash Register</h1>
      <p className="text-gray-500 text-sm mb-6">Daily shift management</p>

      {/* Open/Active Register */}
      {!register ? (
        <div className="card max-w-md mx-auto text-center py-8">
          <HiOutlineLockClosed className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="font-heading font-semibold text-lg text-gray-900 mb-2">Register is Closed</h3>
          <p className="text-gray-500 text-sm mb-4">Open the register to start recording transactions</p>
          <div className="flex items-end gap-2 justify-center">
            <div><label className="label">Opening Balance</label><input type="number" step="0.01" className="input-field w-40 text-center" placeholder="0.00" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} /></div>
            <button onClick={openRegister} className="btn-primary flex items-center gap-2"><HiOutlineLockOpen className="w-4 h-4" /> Open Register</button>
          </div>
        </div>
      ) : (
        <>
          {/* Active Register Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="card text-center py-3"><p className="text-xs text-gray-500">Opening</p><p className="text-xl font-heading font-bold">{formatCurrency(register.openingBalance)}</p></div>
            <div className="card text-center py-3"><p className="text-xs text-gray-500">Cash In</p><p className="text-xl font-heading font-bold text-green-600">+{formatCurrency(register.cashIn)}</p></div>
            <div className="card text-center py-3"><p className="text-xs text-gray-500">Cash Out</p><p className="text-xl font-heading font-bold text-red-600">-{formatCurrency(register.cashOut)}</p></div>
            <div className="card text-center py-3 border-2 border-primary-200"><p className="text-xs text-gray-500">Expected</p><p className="text-xl font-heading font-bold text-primary-700">{formatCurrency(expected)}</p></div>
            <div className="card text-center py-3"><p className="text-xs text-gray-500">Transactions</p><p className="text-xl font-heading font-bold">{register.transactions?.length || 0}</p></div>
          </div>

          {/* Add Transaction */}
          <form onSubmit={addTx} className="card mb-4">
            <h3 className="font-heading font-semibold text-sm mb-3">Record Cash Transaction</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div><label className="label">Type</label>
                <select className="input-field w-28 text-sm" value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}>
                  <option value="cash_in">Cash In</option><option value="cash_out">Cash Out</option>
                </select>
              </div>
              <div><label className="label">Category</label>
                <select className="input-field w-36 text-sm" value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="expense">Expense</option><option value="supplier_payment">Supplier Payment</option>
                  <option value="withdrawal">Withdrawal</option><option value="deposit">Deposit</option>
                  <option value="payment_received">Payment Received</option><option value="other">Other</option>
                </select>
              </div>
              <div><label className="label">Amount *</label><input type="number" step="0.01" className="input-field w-28 text-sm" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} required /></div>
              <div className="flex-1"><label className="label">Description</label><input className="input-field text-sm" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} /></div>
              <button type="submit" className="btn-primary text-sm">Add</button>
            </div>
          </form>

          {/* Transactions list */}
          {register.transactions?.length > 0 && (
            <div className="card overflow-hidden p-0 mb-4">
              <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-heading font-semibold text-sm">Today's Transactions</h3></div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {[...register.transactions].reverse().map((tx, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-xs text-gray-400">{new Date(tx.recordedAt).toLocaleTimeString()}</td>
                        <td className="px-4 py-2"><span className={`badge text-[10px] ${tx.type === 'cash_in' ? 'badge-green' : 'badge-red'}`}>{tx.type === 'cash_in' ? 'IN' : 'OUT'}</span></td>
                        <td className="px-4 py-2 text-xs">{tx.category}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{tx.description}</td>
                        <td className="px-4 py-2 text-right font-bold">{tx.type === 'cash_in' ? '+' : '-'}{formatCurrency(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Close Register */}
          <div className="card bg-red-50/30 border-red-100">
            <h3 className="font-heading font-semibold text-sm mb-3">Close Register</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div><label className="label">Actual Cash Count *</label><input type="number" step="0.01" className="input-field w-40" placeholder={expected.toFixed(2)} value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} /></div>
              <div className="flex-1"><label className="label">Notes</label><input className="input-field" value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} /></div>
              <button onClick={closeRegister} className="btn-danger flex items-center gap-2"><HiOutlineLockClosed className="w-4 h-4" /> Close Register</button>
            </div>
          </div>
        </>
      )}

      {/* History */}
      <div className="card overflow-hidden p-0 mt-6">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-heading font-semibold text-gray-900">Register History</h3></div>
        {history.length > 0 ? (
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-2">Date</th><th className="px-4 py-2">Opening</th><th className="px-4 py-2">In</th><th className="px-4 py-2">Out</th>
              <th className="px-4 py-2">Closing</th><th className="px-4 py-2">Diff</th><th className="px-4 py-2">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {history.map(r => (
                <tr key={r._id}>
                  <td className="px-4 py-2 text-xs">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{formatCurrency(r.openingBalance)}</td>
                  <td className="px-4 py-2 text-green-600">+{formatCurrency(r.cashIn)}</td>
                  <td className="px-4 py-2 text-red-600">-{formatCurrency(r.cashOut)}</td>
                  <td className="px-4 py-2 font-bold">{r.closingBalance != null ? formatCurrency(r.closingBalance) : '—'}</td>
                  <td className="px-4 py-2">
                    {r.overage > 0 && <span className="text-green-600 text-xs">+{formatCurrency(r.overage)}</span>}
                    {r.shortage > 0 && <span className="text-red-600 text-xs">-{formatCurrency(r.shortage)}</span>}
                    {!r.overage && !r.shortage && r.status === 'closed' && <span className="text-gray-400 text-xs">OK</span>}
                  </td>
                  <td className="px-4 py-2"><span className={`badge ${r.status === 'open' ? 'badge-green' : 'badge-gray'} text-[10px]`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-center py-8 text-gray-400">No history yet</p>}
      </div>
    </div>
  );
}
