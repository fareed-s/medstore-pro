import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineEye, HiOutlineExclamation, HiOutlineHeart } from 'react-icons/hi';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerName: '', phone: '', email: '', dateOfBirth: '', gender: '', customerType: 'regular', creditLimit: 0 });
  const [editId, setEditId] = useState(null);

  useEffect(() => { fetchCustomers(); }, [typeFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const { data } = await API.get(`/customers?${params}`);
      setCustomers(data.data);
    } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) { toast.error('Customer name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
    try {
      if (editId) { await API.put(`/customers/${editId}`, form); toast.success('Customer updated successfully'); }
      else { await API.post('/customers', form); toast.success('Customer added successfully'); }
      resetForm(); fetchCustomers();
    } catch(err) { toast.error(err.response?.data?.message || "Failed to save customer"); }
  };

  const resetForm = () => { setForm({ customerName: '', phone: '', email: '', dateOfBirth: '', gender: '', customerType: 'regular', creditLimit: 0 }); setEditId(null); setShowForm(false); };

  const tierColors = { Bronze: 'text-amber-700 bg-amber-50', Silver: 'text-gray-500 bg-gray-100', Gold: 'text-yellow-600 bg-yellow-50', Platinum: 'text-purple-600 bg-purple-50' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Customers</h1><p className="text-gray-500 text-sm">{customers.length} customers</p></div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary flex items-center gap-2"><HiOutlinePlus className="w-4 h-4" /> Add Customer</button>
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()} />
          </div>
          <select className="input-field w-40 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {['regular', 'chronic', 'wholesale', 'insurance', 'employee'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={fetchCustomers} className="btn-primary text-sm">Search</button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6">
          <h3 className="font-heading font-semibold text-gray-900 mb-4">{editId ? 'Edit' : 'New'} Customer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="label">Name *</label><input className="input-field" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required /></div>
            <div><label className="label">Phone *</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
            <div><label className="label">Email</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Date of Birth</label><input type="date" className="input-field" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
            <div><label className="label">Gender</label><select className="input-field" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div><label className="label">Type</label><select className="input-field" value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })}>
              {['walk-in', 'regular', 'chronic', 'wholesale', 'insurance', 'employee'].map(t => <option key={t} value={t}>{t}</option>)}
            </select></div>
            <div><label className="label">Credit Limit</label><input type="number" className="input-field" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div className="flex gap-2 mt-4"><button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button><button type="button" onClick={resetForm} className="btn-secondary">Cancel</button></div>
        </form>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-3">Customer</th><th className="px-4 py-3 hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 hidden lg:table-cell">Loyalty</th>
                <th className="px-4 py-3 hidden lg:table-cell">Spent</th><th className="px-4 py-3 hidden md:table-cell">Allergies</th><th className="px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{c.customerName}</p><p className="text-xs text-gray-400">{c.phone}</p></td>
                    <td className="px-4 py-3 hidden md:table-cell"><span className="badge badge-blue text-[10px]">{c.customerType}</span></td>
                    <td className="px-4 py-3 text-right">
                      {c.currentBalance > 0 ? <span className="font-bold text-red-600">{formatCurrency(c.currentBalance)}</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`badge text-[10px] ${tierColors[c.loyaltyTier] || ''}`}>{c.loyaltyTier} • {c.loyaltyPoints}pts</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500">{formatCurrency(c.totalSpent)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {c.allergies?.length > 0 ? (
                        <span className="badge badge-red text-[10px] flex items-center gap-0.5"><HiOutlineExclamation className="w-3 h-3" />{c.allergies.length} allergies</span>
                      ) : <span className="text-gray-300 text-xs">None</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/customers/${c._id}`} className="p-1.5 hover:bg-gray-100 rounded-lg inline-block"><HiOutlineEye className="w-4 h-4 text-gray-500" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
