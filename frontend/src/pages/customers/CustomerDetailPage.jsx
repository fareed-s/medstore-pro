import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlineArrowLeft, HiOutlineCash, HiOutlinePlus, HiOutlineTrash, HiOutlineExclamation, HiOutlineHeart } from 'react-icons/hi';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Allergy form
  const [newAllergy, setNewAllergy] = useState({ name: '', severity: 'moderate' });
  const [newMed, setNewMed] = useState({ medicineName: '', dosage: '', prescribedBy: '' });
  const [newCondition, setNewCondition] = useState({ name: '' });

  // Payment form
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '' });

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const [custRes, ledRes] = await Promise.all([
        API.get(`/customers/${id}`),
        API.get(`/customers/${id}/ledger`),
      ]);
      setCustomer(custRes.data.data);
      setLedger(ledRes.data.data);
    } catch { navigate('/customers'); } finally { setLoading(false); }
  };

  const addAllergy = async () => {
    if (!newAllergy.name) return;
    const allergies = [...(customer.allergies || []), newAllergy];
    await API.put(`/customers/${id}/allergies`, { allergies });
    setNewAllergy({ name: '', severity: 'moderate' });
    fetchData(); toast.success('Allergy added');
  };

  const removeAllergy = async (idx) => {
    const allergies = customer.allergies.filter((_, i) => i !== idx);
    await API.put(`/customers/${id}/allergies`, { allergies });
    fetchData();
  };

  const addMedication = async () => {
    if (!newMed.medicineName) return;
    const medications = [...(customer.currentMedications || []), { ...newMed, startDate: new Date() }];
    await API.put(`/customers/${id}/medications`, { medications });
    setNewMed({ medicineName: '', dosage: '', prescribedBy: '' });
    fetchData(); toast.success('Medication added');
  };

  const removeMedication = async (idx) => {
    const medications = customer.currentMedications.filter((_, i) => i !== idx);
    await API.put(`/customers/${id}/medications`, { medications });
    fetchData();
  };

  const addCondition = async () => {
    if (!newCondition.name) return;
    const conditions = [...(customer.conditions || []), { ...newCondition, diagnosedDate: new Date() }];
    await API.put(`/customers/${id}/conditions`, { conditions });
    setNewCondition({ name: '' });
    fetchData(); toast.success('Condition added');
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post(`/customers/${id}/payment`, { ...payForm, amount: parseFloat(payForm.amount) });
      toast.success(`Payment recorded. New balance: ${formatCurrency(data.newBalance)}`);
      setShowPayment(false); setPayForm({ amount: '', method: 'cash', reference: '' });
      fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  if (!customer) return null;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'medical', label: `Medical Profile (${(customer.allergies?.length || 0) + (customer.currentMedications?.length || 0)})` },
    { key: 'ledger', label: 'Ledger' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/customers')} className="btn-ghost text-sm mb-4 flex items-center gap-1"><HiOutlineArrowLeft className="w-4 h-4" /> Back</button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">{customer.customerName}</h1>
            <span className="badge badge-blue">{customer.customerType}</span>
            <span className={`badge text-[10px] ${customer.loyaltyTier === 'Gold' ? 'bg-yellow-50 text-yellow-600' : customer.loyaltyTier === 'Platinum' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>{customer.loyaltyTier}</span>
          </div>
          <p className="text-gray-500">{customer.phone} {customer.email && `• ${customer.email}`}</p>
          {customer.allergies?.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-red-600">
              <HiOutlineExclamation className="w-4 h-4" />
              <span className="text-sm font-medium">⚠ {customer.allergies.map(a => a.name).join(', ')}</span>
            </div>
          )}
        </div>
        <button onClick={() => setShowPayment(!showPayment)} className="btn-primary flex items-center gap-2"><HiOutlineCash className="w-4 h-4" /> Record Payment</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="card text-center py-3"><p className="text-xs text-gray-500">Balance Due</p><p className={`text-xl font-heading font-bold ${customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(customer.currentBalance)}</p></div>
        <div className="card text-center py-3"><p className="text-xs text-gray-500">Credit Limit</p><p className="text-xl font-heading font-bold">{formatCurrency(customer.creditLimit)}</p></div>
        <div className="card text-center py-3"><p className="text-xs text-gray-500">Total Spent</p><p className="text-xl font-heading font-bold text-primary-600">{formatCurrency(customer.totalSpent)}</p></div>
        <div className="card text-center py-3"><p className="text-xs text-gray-500">Loyalty Points</p><p className="text-xl font-heading font-bold">{customer.loyaltyPoints}</p></div>
        <div className="card text-center py-3"><p className="text-xs text-gray-500">Visits</p><p className="text-xl font-heading font-bold">{customer.visitCount}</p></div>
      </div>

      {/* Payment Form */}
      {showPayment && (
        <form onSubmit={recordPayment} className="card mb-6 bg-green-50/30 border-green-100">
          <h3 className="font-heading font-semibold text-sm mb-3">Record Payment from {customer.customerName}</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div><label className="label">Amount *</label><input type="number" step="0.01" className="input-field w-32" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required /></div>
            <div><label className="label">Method</label><select className="input-field w-32" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option></select></div>
            <div><label className="label">Reference</label><input className="input-field w-36" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} /></div>
            <button type="submit" className="btn-primary">Pay</button>
            <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>{tab.label}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-sm">
            {[
              ['Phone', customer.phone], ['Email', customer.email || '—'], ['Gender', customer.gender || '—'],
              ['DOB', customer.dateOfBirth ? formatDate(customer.dateOfBirth) : '—'], ['Type', customer.customerType],
              ['Last Visit', customer.lastVisit ? formatDate(customer.lastVisit) : 'Never'],
              ['Insurance', customer.insuranceDetails?.company || 'None'],
              ['Co-pay', customer.insuranceDetails?.coPayPercent ? `${customer.insuranceDetails.coPayPercent}%` : '—'],
            ].map(([label, val]) => (
              <div key={label}><p className="text-xs text-gray-400">{label}</p><p className="font-medium text-gray-800">{val}</p></div>
            ))}
          </div>
        </div>
      )}

      {/* Medical Profile Tab */}
      {activeTab === 'medical' && (
        <div className="space-y-4">
          {/* Allergies */}
          <div className="card">
            <h3 className="font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <HiOutlineExclamation className="w-5 h-5 text-red-500" /> Allergies ({customer.allergies?.length || 0})
            </h3>
            {customer.allergies?.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <span className={`badge text-[10px] ${a.severity === 'severe' ? 'badge-red' : a.severity === 'moderate' ? 'badge-amber' : 'badge-gray'}`}>{a.severity}</span>
                <span className="font-medium text-sm">{a.name}</span>
                <button onClick={() => removeAllergy(i)} className="ml-auto p-1 hover:bg-red-50 rounded"><HiOutlineTrash className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            ))}
            <div className="flex gap-2 mt-3 items-end">
              <input className="input-field flex-1 text-sm" placeholder="Allergy name" value={newAllergy.name} onChange={(e) => setNewAllergy({ ...newAllergy, name: e.target.value })} />
              <select className="input-field w-28 text-sm" value={newAllergy.severity} onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value })}>
                <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
              </select>
              <button onClick={addAllergy} className="btn-primary text-sm"><HiOutlinePlus className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Current Medications */}
          <div className="card">
            <h3 className="font-heading font-semibold text-gray-900 mb-3">Current Medications ({customer.currentMedications?.length || 0})</h3>
            {customer.currentMedications?.map((m, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <span className="font-medium text-sm">{m.medicineName}</span>
                <span className="text-xs text-gray-400">{m.dosage} • Dr. {m.prescribedBy}</span>
                <button onClick={() => removeMedication(i)} className="ml-auto p-1 hover:bg-red-50 rounded"><HiOutlineTrash className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            ))}
            <div className="flex gap-2 mt-3 items-end">
              <input className="input-field flex-1 text-sm" placeholder="Medicine name" value={newMed.medicineName} onChange={(e) => setNewMed({ ...newMed, medicineName: e.target.value })} />
              <input className="input-field w-24 text-sm" placeholder="Dosage" value={newMed.dosage} onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })} />
              <input className="input-field w-28 text-sm" placeholder="Doctor" value={newMed.prescribedBy} onChange={(e) => setNewMed({ ...newMed, prescribedBy: e.target.value })} />
              <button onClick={addMedication} className="btn-primary text-sm"><HiOutlinePlus className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Conditions */}
          <div className="card">
            <h3 className="font-heading font-semibold text-gray-900 mb-3">Medical Conditions ({customer.conditions?.length || 0})</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {customer.conditions?.map((c, i) => (
                <span key={i} className="badge badge-amber">{c.name}</span>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <input className="input-field flex-1 text-sm" placeholder="e.g. Diabetes, Hypertension" value={newCondition.name} onChange={(e) => setNewCondition({ name: e.target.value })} />
              <button onClick={addCondition} className="btn-primary text-sm"><HiOutlinePlus className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Tab */}
      {activeTab === 'ledger' && ledger && (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-heading font-semibold text-gray-900">Customer Ledger</h3>
          </div>
          {ledger.entries?.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-2">Date</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2 text-right">Debit</th><th className="px-4 py-2 text-right">Credit</th><th className="px-4 py-2 text-right">Balance</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {ledger.entries.map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-xs text-gray-500">{formatDate(e.date)}</td>
                    <td className="px-4 py-2"><span className={`badge ${e.type === 'sale' ? 'badge-red' : 'badge-green'} text-[10px]`}>{e.type}</span></td>
                    <td className="px-4 py-2 text-xs">{e.ref}</td>
                    <td className="px-4 py-2 text-right">{e.debit > 0 ? <span className="text-red-600">{formatCurrency(e.debit)}</span> : '—'}</td>
                    <td className="px-4 py-2 text-right">{e.credit > 0 ? <span className="text-green-600">{formatCurrency(e.credit)}</span> : '—'}</td>
                    <td className="px-4 py-2 text-right font-bold">{formatCurrency(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-center py-8 text-gray-400">No transactions</p>}
        </div>
      )}
    </div>
  );
}
