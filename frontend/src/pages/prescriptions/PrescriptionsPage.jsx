import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineEye, HiOutlineSearch } from 'react-icons/hi';

export default function PrescriptionsPage() {
  const { hasRole } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [form, setForm] = useState({ customerId: '', customerName: '', doctorName: '', doctorRegistration: '', doctorSpecialty: '', diagnosis: '', medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', quantity: '' }] });

  useEffect(() => { fetchRx(); }, [statusFilter]);

  const fetchRx = async () => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    try { const { data } = await API.get(`/prescriptions${params}`); setPrescriptions(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const searchCustomers = async (q) => {
    if (q.length < 2) return;
    try { const { data } = await API.get(`/customers/search?q=${q}`); setCustomers(data.data); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const addMedicineLine = () => setForm({ ...form, medicines: [...form.medicines, { medicineName: '', dosage: '', frequency: '', duration: '', quantity: '' }] });
  const removeMedicineLine = (idx) => setForm({ ...form, medicines: form.medicines.filter((_, i) => i !== idx) });
  const updateMedicine = (idx, field, value) => {
    setForm({ ...form, medicines: form.medicines.map((m, i) => i === idx ? { ...m, [field]: value } : m) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerId) return toast.error('Select a customer');
    if (!form.doctorName) return toast.error('Doctor name required');
    try {
      await API.post('/prescriptions', form);
      toast.success('Prescription saved');
      setShowForm(false); fetchRx();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const statusBadge = { active: 'badge-blue', dispensed: 'badge-green', partial: 'badge-amber', expired: 'badge-red', cancelled: 'badge-gray' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Prescriptions</h1></div>
        {hasRole('SuperAdmin', 'StoreAdmin', 'Pharmacist') && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><HiOutlinePlus className="w-4 h-4" /> New Prescription</button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'active', 'partial', 'dispensed', 'expired'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s || 'All'}</button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6">
          <h3 className="font-heading font-semibold text-gray-900 mb-4">New Prescription</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <label className="label">Customer *</label>
              <input className="input-field" placeholder="Search customer..." value={custSearch} onChange={(e) => { setCustSearch(e.target.value); searchCustomers(e.target.value); }} />
              {customers.length > 0 && custSearch.length >= 2 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border max-h-40 overflow-y-auto">
                  {customers.map(c => (
                    <button key={c._id} type="button" onClick={() => { setForm({ ...form, customerId: c._id, customerName: c.customerName }); setCustSearch(c.customerName); setCustomers([]); }}
                      className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm border-b">{c.customerName} — {c.phone}</button>
                  ))}
                </div>
              )}
            </div>
            <div><label className="label">Doctor Name *</label><input className="input-field" value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} required /></div>
            <div><label className="label">Doctor Registration</label><input className="input-field" value={form.doctorRegistration} onChange={(e) => setForm({ ...form, doctorRegistration: e.target.value })} /></div>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2"><label className="label mb-0">Prescribed Medicines</label><button type="button" onClick={addMedicineLine} className="text-primary-600 text-sm font-medium hover:underline">+ Add Line</button></div>
            {form.medicines.map((m, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-end">
                <input className="input-field flex-[2] text-sm" placeholder="Medicine name" value={m.medicineName} onChange={(e) => updateMedicine(idx, 'medicineName', e.target.value)} />
                <input className="input-field w-24 text-sm" placeholder="Dosage" value={m.dosage} onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)} />
                <input className="input-field w-28 text-sm" placeholder="Frequency" value={m.frequency} onChange={(e) => updateMedicine(idx, 'frequency', e.target.value)} />
                <input className="input-field w-20 text-sm" placeholder="Days" value={m.duration} onChange={(e) => updateMedicine(idx, 'duration', e.target.value)} />
                <input type="number" className="input-field w-16 text-sm" placeholder="Qty" value={m.quantity} onChange={(e) => updateMedicine(idx, 'quantity', e.target.value)} />
                {form.medicines.length > 1 && <button type="button" onClick={() => removeMedicineLine(idx)} className="p-1 text-red-400 hover:bg-red-50 rounded">✕</button>}
              </div>
            ))}
          </div>
          <div className="flex gap-2"><button type="submit" className="btn-primary">Save Prescription</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
        </form>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No prescriptions found</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Patient</th><th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3 hidden md:table-cell">Medicines</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden lg:table-cell">Date</th><th className="px-4 py-3 hidden lg:table-cell">Expiry</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {prescriptions.map(rx => (
                <tr key={rx._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3"><p className="font-medium">{rx.customerName || rx.customerId?.customerName}</p><p className="text-xs text-gray-400">{rx.customerId?.phone}</p></td>
                  <td className="px-4 py-3 text-gray-600">Dr. {rx.doctorName}<p className="text-xs text-gray-400">{rx.doctorSpecialty}</p></td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-gray-500">{rx.medicines?.map(m => m.medicineName).join(', ')}</p>
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${statusBadge[rx.status]}`}>{rx.status}</span></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDate(rx.prescriptionDate)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDate(rx.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
