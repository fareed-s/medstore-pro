import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineEye, HiOutlineSearch, HiOutlineStar } from 'react-icons/hi';

export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    supplierName: '', companyName: '', phone: '', email: '',
    city: '', drugLicenseNumber: '', dlExpiryDate: '', paymentTerms: 'COD',
    creditLimit: 0, contactPerson: '', notes: '',
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try { const { data } = await API.get(`/purchase/suppliers?search=${search}`); setSuppliers(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, address: { city: form.city } };
    try {
      if (editId) { await API.put(`/purchase/suppliers/${editId}`, payload); toast.success('Supplier updated'); }
      else { await API.post('/purchase/suppliers', payload); toast.success('Supplier added'); }
      resetForm(); fetchSuppliers();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const startEdit = (s) => {
    setForm({ supplierName: s.supplierName, companyName: s.companyName || '', phone: s.phone, email: s.email || '', city: s.address?.city || '', drugLicenseNumber: s.drugLicenseNumber || '', dlExpiryDate: s.dlExpiryDate ? s.dlExpiryDate.split('T')[0] : '', paymentTerms: s.paymentTerms, creditLimit: s.creditLimit, contactPerson: s.contactPerson || '', notes: s.notes || '' });
    setEditId(s._id); setShowForm(true);
  };

  const resetForm = () => {
    setForm({ supplierName: '', companyName: '', phone: '', email: '', city: '', drugLicenseNumber: '', dlExpiryDate: '', paymentTerms: 'COD', creditLimit: 0, contactPerson: '', notes: '' });
    setEditId(null); setShowForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Suppliers</h1><p className="text-gray-500 text-sm">{suppliers.length} suppliers</p></div>
        {hasRole('SuperAdmin', 'StoreAdmin') && (
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary flex items-center gap-2"><HiOutlinePlus className="w-4 h-4" /> Add Supplier</button>
        )}
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchSuppliers()} />
          </div>
          <button onClick={fetchSuppliers} className="btn-primary text-sm">Search</button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6">
          <h3 className="font-heading font-semibold text-gray-900 mb-4">{editId ? 'Edit Supplier' : 'New Supplier'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="label">Supplier Name *</label><input className="input-field" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} required /></div>
            <div><label className="label">Company</label><input className="input-field" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></div>
            <div><label className="label">Phone *</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
            <div><label className="label">Email</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">City</label><input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><label className="label">Contact Person</label><input className="input-field" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
            <div><label className="label">Drug License #</label><input className="input-field" value={form.drugLicenseNumber} onChange={(e) => setForm({ ...form, drugLicenseNumber: e.target.value })} /></div>
            <div><label className="label">DL Expiry</label><input type="date" className="input-field" value={form.dlExpiryDate} onChange={(e) => setForm({ ...form, dlExpiryDate: e.target.value })} /></div>
            <div><label className="label">Payment Terms</label>
              <select className="input-field" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
                {['COD', 'Credit 15', 'Credit 30', 'Credit 60', 'Credit 90'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Credit Limit (Rs.)</label><input type="number" className="input-field" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} /></div>
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
                <th className="px-4 py-3">Supplier</th><th className="px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 hidden lg:table-cell">Terms</th><th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 hidden lg:table-cell">DL #</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {suppliers.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{s.supplierName}</p><p className="text-xs text-gray-400">{s.companyName}</p></td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">{s.phone}</td>
                    <td className="px-4 py-3 hidden lg:table-cell"><span className="badge badge-blue text-[10px]">{s.paymentTerms}</span></td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${s.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(s.currentBalance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{s.drugLicenseNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <HiOutlineStar key={i} className={`w-3.5 h-3.5 ${i <= s.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link to={`/purchase/suppliers/${s._id}`} className="p-1.5 hover:bg-gray-100 rounded-lg"><HiOutlineEye className="w-4 h-4 text-gray-500" /></Link>
                        {hasRole('SuperAdmin', 'StoreAdmin') && <button onClick={() => startEdit(s)} className="p-1.5 hover:bg-gray-100 rounded-lg"><HiOutlinePencil className="w-4 h-4 text-gray-500" /></button>}
                      </div>
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
