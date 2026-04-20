import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { ROLE_LABELS } from '../../utils/helpers';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineBan, HiOutlineCheck } from 'react-icons/hi';

const ROLES = ['Pharmacist', 'Cashier', 'InventoryStaff'];

export default function StaffPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'Cashier' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const { data } = await API.get('/users'); setUsers(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        const { password, email, ...rest } = form;
        await API.put(`/users/${editId}`, rest);
        toast.success('Staff updated');
      } else {
        await API.post('/users', form);
        toast.success('Staff member added');
      }
      resetForm();
      fetchUsers();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const toggleActive = async (id, isActive) => {
    await API.put(`/users/${id}`, { isActive: !isActive });
    toast.success(isActive ? 'User deactivated' : 'User activated');
    fetchUsers();
  };

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', phone: '', role: 'Cashier' });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', phone: u.phone || '', role: u.role });
    setEditId(u._id);
    setShowForm(true);
  };

  const roleBg = { StoreAdmin: 'badge-green', Pharmacist: 'badge-blue', Cashier: 'badge-amber', InventoryStaff: 'badge-gray' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm">{users.length} team members</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6">
          <h3 className="font-heading font-semibold text-gray-900 mb-4">{editId ? 'Edit Staff' : 'New Staff Member'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="label">Full Name *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            {!editId && <div><label className="label">Email *</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>}
            {!editId && <div><label className="label">Password *</label><input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>}
            <div><label className="label">Phone</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Role *</label>
              <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
            <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">{u.name?.charAt(0)?.toUpperCase()}</div>
                      <div><p className="font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.phone}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className={`badge ${roleBg[u.role] || 'badge-gray'}`}>{ROLE_LABELS[u.role]}</span></td>
                  <td className="px-4 py-3"><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Edit"><HiOutlinePencil className="w-4 h-4 text-gray-500" /></button>
                      {u.role !== 'StoreAdmin' && (
                        <button onClick={() => toggleActive(u._id, u.isActive)} className="p-1.5 rounded-lg hover:bg-gray-100" title={u.isActive ? 'Deactivate' : 'Activate'}>
                          {u.isActive ? <HiOutlineBan className="w-4 h-4 text-red-500" /> : <HiOutlineCheck className="w-4 h-4 text-green-500" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
