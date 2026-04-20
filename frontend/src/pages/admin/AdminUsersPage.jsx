import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlineUsers, HiOutlineSearch, HiOutlineBan, HiOutlineCheck } from 'react-icons/hi';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const { data } = await API.get('/superadmin/users?limit=200'); setUsers(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const toggleActive = async (id, isActive) => {
    try { await API.put(`/superadmin/users/${id}`, { isActive: !isActive }); toast.success(isActive ? 'User deactivated' : 'User activated'); fetchUsers(); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const filtered = users.filter(u => {
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    return true;
  });

  const roleBadge = { SuperAdmin: 'badge-red', StoreAdmin: 'badge-blue', Pharmacist: 'badge-green', Cashier: 'badge-amber', InventoryStaff: 'badge-gray' };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">All Platform Users</h1>
      <p className="text-gray-500 text-sm mb-6">{users.length} total users across all stores</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {['SuperAdmin', 'StoreAdmin', 'Pharmacist', 'Cashier', 'InventoryStaff'].map(role => (
          <div key={role} className="card text-center py-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRoleFilter(roleFilter === role ? '' : role)}>
            <p className="text-xs text-gray-500">{role}</p>
            <p className={`text-xl font-heading font-bold ${roleFilter === role ? 'text-primary-600' : ''}`}>{users.filter(u => u.role === role).length}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative"><HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-40" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {['SuperAdmin', 'StoreAdmin', 'Pharmacist', 'Cashier', 'InventoryStaff'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3 hidden md:table-cell">Store</th>
              <th className="px-4 py-3 hidden lg:table-cell">Last Login</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u._id} className={`hover:bg-gray-50/50 ${!u.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3"><p className="font-medium">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></td>
                  <td className="px-4 py-3"><span className={`badge ${roleBadge[u.role]} text-[10px]`}>{u.role}</span></td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{u.storeId?.storeName || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                  <td className="px-4 py-3"><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'} text-[10px]`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3">
                    {u.role !== 'SuperAdmin' && (
                      <button onClick={() => toggleActive(u._id, u.isActive)} className={`text-xs font-medium hover:underline ${u.isActive ? 'text-red-500' : 'text-green-600'}`}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
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
