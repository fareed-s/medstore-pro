import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlineArrowLeft, HiOutlineCash } from 'react-icons/hi';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '', notes: '' });
  const [paying, setPaying] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const [supRes, ledRes] = await Promise.all([
        API.get(`/purchase/suppliers/${id}`),
        API.get(`/purchase/suppliers/${id}/ledger`),
      ]);
      setSupplier(supRes.data.data);
      setLedger(ledRes.data.data);
    } catch { navigate('/purchase/suppliers'); } finally { setLoading(false); }
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      const { data } = await API.post('/purchase/payments', { supplierId: id, ...payForm, amount: parseFloat(payForm.amount) });
      toast.success(`Payment of ${formatCurrency(payForm.amount)} recorded. New balance: ${formatCurrency(data.newBalance)}`);
      setShowPayment(false); setPayForm({ amount: '', method: 'cash', reference: '', notes: '' });
      fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } finally { setPaying(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  if (!supplier) return null;

  const typeBadge = { purchase: 'badge-red', payment: 'badge-green', return: 'badge-blue' };

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/purchase/suppliers')} className="btn-ghost text-sm mb-4 flex items-center gap-1"><HiOutlineArrowLeft className="w-4 h-4" /> Back</button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">{supplier.supplierName}</h1>
          <p className="text-gray-500">{supplier.companyName} • {supplier.phone}</p>
          {supplier.drugLicenseNumber && <p className="text-xs text-gray-400 mt-1">DL: {supplier.drugLicenseNumber} {supplier.dlExpiryDate && `(exp: ${formatDate(supplier.dlExpiryDate)})`}</p>}
        </div>
        <button onClick={() => setShowPayment(!showPayment)} className="btn-primary flex items-center gap-2"><HiOutlineCash className="w-4 h-4" /> Record Payment</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center py-3">
          <p className="text-xs text-gray-500">Current Balance</p>
          <p className={`text-2xl font-heading font-bold ${supplier.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(supplier.currentBalance)}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-500">Total Purchases</p>
          <p className="text-2xl font-heading font-bold text-gray-900">{formatCurrency(supplier.totalPurchases)}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-500">Total Payments</p>
          <p className="text-2xl font-heading font-bold text-primary-600">{formatCurrency(supplier.totalPayments)}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-500">Payment Terms</p>
          <p className="text-lg font-heading font-bold text-gray-900">{supplier.paymentTerms}</p>
          <p className="text-xs text-gray-400">Limit: {formatCurrency(supplier.creditLimit)}</p>
        </div>
      </div>

      {/* Payment Form */}
      {showPayment && (
        <form onSubmit={recordPayment} className="card mb-6 bg-green-50/30 border-green-100">
          <h3 className="font-heading font-semibold text-gray-900 mb-3">Record Payment to {supplier.supplierName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div><label className="label">Amount (Rs.) *</label><input type="number" step="0.01" className="input-field" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required /></div>
            <div><label className="label">Method</label>
              <select className="input-field" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                <option value="cash">Cash</option><option value="cheque">Cheque</option><option value="bank_transfer">Bank Transfer</option><option value="upi">UPI</option>
              </select>
            </div>
            <div><label className="label">Reference</label><input className="input-field" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Cheque/Ref #" /></div>
            <div><label className="label">Notes</label><input className="input-field" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-3"><button type="submit" disabled={paying} className="btn-primary">{paying ? 'Processing...' : 'Record Payment'}</button><button type="button" onClick={() => setShowPayment(false)} className="btn-secondary">Cancel</button></div>
        </form>
      )}

      {/* Ledger */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-heading font-semibold text-gray-900">Supplier Ledger</h3>
          <span className="text-sm text-gray-500">{ledger?.entries?.length || 0} transactions</span>
        </div>
        {ledger?.entries?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-2">Date</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2 text-right">Debit (Owe)</th><th className="px-4 py-2 text-right">Credit (Paid)</th><th className="px-4 py-2 text-right">Balance</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {ledger.entries.map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-xs text-gray-500">{formatDate(e.date)}</td>
                    <td className="px-4 py-2"><span className={`badge ${typeBadge[e.type]} text-[10px]`}>{e.type}</span></td>
                    <td className="px-4 py-2 text-xs">{e.ref || e.invoiceNo || '—'} {e.method && <span className="text-gray-400">({e.method})</span>}</td>
                    <td className="px-4 py-2 text-right">{e.debit > 0 ? <span className="text-red-600 font-medium">{formatCurrency(e.debit)}</span> : '—'}</td>
                    <td className="px-4 py-2 text-right">{e.credit > 0 ? <span className="text-green-600 font-medium">{formatCurrency(e.credit)}</span> : '—'}</td>
                    <td className="px-4 py-2 text-right font-bold">{formatCurrency(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-2">TOTAL</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatCurrency(ledger.totalDebit)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{formatCurrency(ledger.totalCredit)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(ledger.currentBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : <p className="text-center py-8 text-gray-400">No transactions yet</p>}
      </div>
    </div>
  );
}
