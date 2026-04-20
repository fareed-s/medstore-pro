import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineDocumentText, HiOutlineExclamation, HiOutlinePencil } from 'react-icons/hi';

const DL_TYPES = [
  { value: 'store_retail', label: 'Retail Drug License' },
  { value: 'store_wholesale', label: 'Wholesale Drug License' },
  { value: 'store_restricted', label: 'Restricted Drug License' },
  { value: 'narcotic', label: 'Narcotic Drug License' },
  { value: 'supplier', label: 'Supplier DL' },
];

export default function DrugLicensesPage() {
  const { hasRole } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'store_retail', licenseNumber: '', issuedTo: '', issuedBy: '', issueDate: '', expiryDate: '', notes: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [licRes, alertRes] = await Promise.all([
        API.get('/regulatory/licenses'),
        API.get('/regulatory/licenses/alerts'),
      ]);
      setLicenses(licRes.data.data);
      setAlerts(alertRes.data.data);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/regulatory/licenses', form);
      toast.success('License added');
      setShowForm(false); setForm({ type: 'store_retail', licenseNumber: '', issuedTo: '', issuedBy: '', issueDate: '', expiryDate: '', notes: '' });
      fetchData();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const statusColor = { active: 'badge-green', expiring_soon: 'badge-amber', expired: 'badge-red', renewal_pending: 'badge-blue' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Drug Licenses</h1><p className="text-gray-500 text-sm">Track all drug license expiry dates</p></div>
        {hasRole('SuperAdmin', 'StoreAdmin') && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><HiOutlinePlus className="w-4 h-4" /> Add License</button>
        )}
      </div>

      {/* Alerts */}
      {alerts && alerts.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card py-3 border-l-4 border-red-500"><p className="text-xs text-red-600 font-medium">Expired</p><p className="text-xl font-heading font-bold text-red-700">{alerts.expired?.length || 0}</p></div>
          <div className="card py-3 border-l-4 border-red-400"><p className="text-xs text-red-500 font-medium">0-30 Days</p><p className="text-xl font-heading font-bold">{alerts.within30?.length || 0}</p></div>
          <div className="card py-3 border-l-4 border-amber-400"><p className="text-xs text-amber-600 font-medium">31-60 Days</p><p className="text-xl font-heading font-bold">{alerts.within60?.length || 0}</p></div>
          <div className="card py-3 border-l-4 border-green-400"><p className="text-xs text-green-600 font-medium">61-90 Days</p><p className="text-xl font-heading font-bold">{alerts.within90?.length || 0}</p></div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-4">
          <h3 className="font-heading font-semibold text-gray-900 mb-3">Add Drug License</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><label className="label">Type *</label><select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{DL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="label">License Number *</label><input className="input-field" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} required /></div>
            <div><label className="label">Issued To</label><input className="input-field" value={form.issuedTo} onChange={(e) => setForm({ ...form, issuedTo: e.target.value })} /></div>
            <div><label className="label">Issued By</label><input className="input-field" value={form.issuedBy} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })} /></div>
            <div><label className="label">Issue Date</label><input type="date" className="input-field" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></div>
            <div><label className="label">Expiry Date *</label><input type="date" className="input-field" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} required /></div>
          </div>
          <div className="flex gap-2 mt-3"><button type="submit" className="btn-primary">Save</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
        </form>
      )}

      {/* Licenses Table */}
      <div className="card overflow-hidden p-0">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Type</th><th className="px-4 py-3">License #</th><th className="px-4 py-3">Issued To</th>
              <th className="px-4 py-3">Issue Date</th><th className="px-4 py-3">Expiry Date</th><th className="px-4 py-3">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {licenses.map(dl => (
                <tr key={dl._id} className={`hover:bg-gray-50/50 ${dl.renewalStatus === 'expired' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-2"><span className="badge badge-blue text-[10px]">{DL_TYPES.find(t => t.value === dl.type)?.label || dl.type}</span></td>
                  <td className="px-4 py-2 font-mono font-bold text-xs">{dl.licenseNumber}</td>
                  <td className="px-4 py-2">{dl.issuedTo || '—'}{dl.supplierId && <p className="text-xs text-gray-400">{dl.supplierId.supplierName}</p>}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{dl.issueDate ? formatDate(dl.issueDate) : '—'}</td>
                  <td className="px-4 py-2 text-xs font-medium">{formatDate(dl.expiryDate)}</td>
                  <td className="px-4 py-2"><span className={`badge ${statusColor[dl.renewalStatus]} text-[10px]`}>{dl.renewalStatus?.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
