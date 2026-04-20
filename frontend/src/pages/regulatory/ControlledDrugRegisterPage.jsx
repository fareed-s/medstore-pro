import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';

export default function ControlledDrugRegisterPage() {
  const { hasRole } = useAuth();
  const [entries, setEntries] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('register');
  const [filters, setFilters] = useState({ schedule: '', dateFrom: '', dateTo: '' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    medicineId: '', medicineName: '', genericName: '', schedule: 'Schedule-H',
    transactionType: 'sale', invoiceNo: '', quantity: 1, direction: 'out',
    patientName: '', patientAge: '', patientGender: '', patientAddress: '', patientPhone: '',
    doctorName: '', doctorRegistration: '', batchNumber: '', notes: '',
  });
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState([]);

  useEffect(() => { fetchData(); }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.schedule) params.set('schedule', filters.schedule);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const [entRes, balRes] = await Promise.all([
        API.get(`/regulatory/controlled-drugs?${params}&limit=100`),
        API.get('/regulatory/controlled-drugs/balance'),
      ]);
      setEntries(entRes.data.data);
      setBalances(balRes.data.data);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const searchMeds = async (q) => {
    if (q.length < 2) { setMedResults([]); return; }
    try {
      const { data } = await API.get(`/medicines/search?q=${q}&limit=5`);
      setMedResults(data.data.filter(m => ['Schedule-H', 'Schedule-H1', 'Schedule-X'].includes(m.schedule)));
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const selectMed = (med) => {
    setForm({ ...form, medicineId: med._id, medicineName: med.medicineName, genericName: med.genericName || '', schedule: med.schedule });
    setMedSearch(med.medicineName); setMedResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/regulatory/controlled-drugs', form);
      toast.success('Entry added to controlled drug register');
      setShowForm(false); setForm({ ...form, patientName: '', patientAge: '', patientAddress: '', patientPhone: '', doctorName: '', doctorRegistration: '', quantity: 1, invoiceNo: '', notes: '' });
      fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const sevBadge = { 'Schedule-H': 'badge-amber', 'Schedule-H1': 'bg-orange-100 text-orange-700', 'Schedule-X': 'badge-red' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Controlled Drug Register</h1><p className="text-gray-500 text-sm">Mandatory register for Schedule H/H1/X drugs</p></div>
        {hasRole('SuperAdmin', 'StoreAdmin', 'Pharmacist') && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><HiOutlinePlus className="w-4 h-4" /> Add Entry</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('register')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'register' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>Register</button>
        <button onClick={() => setTab('balance')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'balance' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>Running Balance</button>
      </div>

      {/* Add Entry Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-4 border-2 border-red-100 bg-red-50/20">
          <h3 className="font-heading font-semibold text-red-800 mb-3">New Register Entry</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div className="relative">
              <label className="label">Medicine *</label>
              <input className="input-field" placeholder="Search controlled drug..." value={medSearch} onChange={(e) => { setMedSearch(e.target.value); searchMeds(e.target.value); }} />
              {medResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border max-h-40 overflow-y-auto">
                  {medResults.map(m => (
                    <button key={m._id} type="button" onClick={() => selectMed(m)} className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm border-b">
                      {m.medicineName} <span className={`badge ${sevBadge[m.schedule]} text-[9px] ml-1`}>{m.schedule}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div><label className="label">Type</label>
              <select className="input-field" value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value, direction: e.target.value === 'purchase' ? 'in' : 'out' })}>
                <option value="sale">Sale</option><option value="purchase">Purchase</option><option value="return">Return</option><option value="destruction">Destruction</option>
              </select>
            </div>
            <div><label className="label">Quantity *</label><input type="number" min="1" className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} required /></div>
            <div><label className="label">Invoice / Ref #</label><input className="input-field" value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} /></div>
          </div>

          <p className="text-xs font-semibold text-red-600 uppercase mb-2 mt-2">Patient Details (Mandatory for H1/X)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div><label className="label">Patient Name *</label><input className="input-field" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} /></div>
            <div><label className="label">Age</label><input type="number" className="input-field" value={form.patientAge} onChange={(e) => setForm({ ...form, patientAge: e.target.value })} /></div>
            <div><label className="label">Gender</label><select className="input-field" value={form.patientGender} onChange={(e) => setForm({ ...form, patientGender: e.target.value })}><option value="">—</option><option>Male</option><option>Female</option></select></div>
            <div><label className="label">Phone</label><input className="input-field" value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value })} /></div>
          </div>

          <p className="text-xs font-semibold text-red-600 uppercase mb-2">Doctor Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><label className="label">Doctor Name *</label><input className="input-field" value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} /></div>
            <div><label className="label">Doctor Registration #</label><input className="input-field" value={form.doctorRegistration} onChange={(e) => setForm({ ...form, doctorRegistration: e.target.value })} /></div>
          </div>

          <div className="flex gap-2"><button type="submit" className="btn-danger">Add to Register</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="input-field text-sm w-40" value={filters.schedule} onChange={(e) => setFilters({ ...filters, schedule: e.target.value })}>
          <option value="">All Schedules</option><option value="Schedule-H">Schedule-H</option><option value="Schedule-H1">Schedule-H1</option><option value="Schedule-X">Schedule-X</option>
        </select>
        <input type="date" className="input-field text-sm w-40" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
        <input type="date" className="input-field text-sm w-40" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
      </div>

      {/* Register Tab */}
      {tab === 'register' && (
        <div className="card overflow-hidden p-0">
          {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : entries.length === 0 ? (
            <p className="text-center py-12 text-gray-400">No entries found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="table-header text-[10px]">
                  <th className="px-2 py-2">Date</th><th className="px-2 py-2">Medicine</th><th className="px-2 py-2">Sch</th>
                  <th className="px-2 py-2">Type</th><th className="px-2 py-2">Patient</th><th className="px-2 py-2">Doctor</th>
                  <th className="px-2 py-2 text-center">Qty</th><th className="px-2 py-2 text-center">Balance</th><th className="px-2 py-2">Ref</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map(e => (
                    <tr key={e._id} className={`hover:bg-gray-50/50 ${e.isCorrection ? 'bg-yellow-50/50' : ''}`}>
                      <td className="px-2 py-1.5 text-gray-500">{formatDate(e.date)}</td>
                      <td className="px-2 py-1.5 font-medium">{e.medicineName}<br/><span className="text-gray-400">{e.genericName}</span></td>
                      <td className="px-2 py-1.5"><span className={`badge ${sevBadge[e.schedule]} text-[9px]`}>{e.schedule?.replace('Schedule-', '')}</span></td>
                      <td className="px-2 py-1.5">
                        <span className={`badge text-[9px] ${e.direction === 'in' ? 'badge-green' : 'badge-red'}`}>{e.transactionType}</span>
                      </td>
                      <td className="px-2 py-1.5">{e.patientName || '—'}<br/><span className="text-gray-400">{e.patientAge ? `${e.patientAge}y` : ''} {e.patientGender || ''}</span></td>
                      <td className="px-2 py-1.5">{e.doctorName || '—'}<br/><span className="text-gray-400">{e.doctorRegistration || ''}</span></td>
                      <td className="px-2 py-1.5 text-center font-bold">{e.direction === 'in' ? '+' : '-'}{e.quantity}</td>
                      <td className="px-2 py-1.5 text-center font-bold">{e.balanceAfter}</td>
                      <td className="px-2 py-1.5 text-gray-400">{e.invoiceNo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Balance Tab */}
      {tab === 'balance' && (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Medicine</th><th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3 text-center">System Stock</th><th className="px-4 py-3 text-center">Register Balance</th>
              <th className="px-4 py-3">Last Entry</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {balances.map(b => (
                <tr key={b._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2"><p className="font-medium">{b.medicineName}</p><p className="text-xs text-gray-400">{b.genericName}</p></td>
                  <td className="px-4 py-2"><span className={`badge ${sevBadge[b.schedule]} text-[10px]`}>{b.schedule}</span></td>
                  <td className="px-4 py-2 text-center font-semibold">{b.currentStock}</td>
                  <td className="px-4 py-2 text-center font-bold">{b.registerBalance}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{b.lastEntryDate ? formatDate(b.lastEntryDate) : 'No entries'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
