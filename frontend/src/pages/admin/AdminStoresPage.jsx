import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlineOfficeBuilding, HiOutlineCheck, HiOutlineBan, HiOutlineSearch, HiOutlineEye } from 'react-icons/hi';

export default function AdminStoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchStores(); }, []);

  const fetchStores = async () => {
    try { const { data } = await API.get('/superadmin/stores?limit=100'); setStores(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const approve = async (id) => { await API.put(`/superadmin/stores/${id}/approve`); toast.success('Store approved'); fetchStores(); };
  const suspend = async (id) => { await API.put(`/superadmin/stores/${id}/suspend`); toast.success('Store suspended'); fetchStores(); };

  const filtered = search ? stores.filter(s => s.storeName?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())) : stores;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">All Stores</h1><p className="text-gray-500 text-sm">{stores.length} registered stores</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card"><div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center"><HiOutlineOfficeBuilding className="w-5 h-5 text-primary-600" /></div><div><p className="text-xs text-gray-500">Total</p><p className="text-xl font-heading font-bold">{stores.length}</p></div></div>
        <div className="stat-card"><div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center"><HiOutlineCheck className="w-5 h-5 text-green-600" /></div><div><p className="text-xs text-gray-500">Active</p><p className="text-xl font-heading font-bold text-green-600">{stores.filter(s => s.isApproved && s.isActive).length}</p></div></div>
        <div className="stat-card"><div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center"><HiOutlineOfficeBuilding className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-gray-500">Pending</p><p className="text-xl font-heading font-bold text-amber-600">{stores.filter(s => !s.isApproved).length}</p></div></div>
        <div className="stat-card"><div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center"><HiOutlineBan className="w-5 h-5 text-red-600" /></div><div><p className="text-xs text-gray-500">Suspended</p><p className="text-xl font-heading font-bold text-red-600">{stores.filter(s => !s.isActive).length}</p></div></div>
      </div>

      <div className="card mb-4">
        <div className="relative"><HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search stores by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Store</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3 hidden md:table-cell">City</th><th className="px-4 py-3 hidden lg:table-cell">Registered</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <tr key={s._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3"><p className="font-medium">{s.storeName}</p><p className="text-xs text-gray-400">{s.email}</p><p className="text-[10px] text-gray-300 font-mono">{s.drugLicenseNumber || '—'}</p></td>
                  <td className="px-4 py-3 text-gray-600">{s.ownerName}<p className="text-xs text-gray-400">{s.ownerPhone}</p></td>
                  <td className="px-4 py-3"><span className={`badge ${s.plan === 'Premium' ? 'badge-blue' : s.plan === 'Free Trial' ? 'badge-amber' : 'badge-gray'}`}>{s.plan}</span></td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">{s.address?.city || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    {!s.isApproved ? <span className="badge badge-amber">Pending</span> : !s.isActive ? <span className="badge badge-red">Suspended</span> : <span className="badge badge-green">Active</span>}
                  </td>
                  <td className="px-4 py-3 flex gap-1">
                    {!s.isApproved && <button onClick={() => approve(s._id)} className="text-xs text-green-600 font-medium hover:underline">Approve</button>}
                    {s.isApproved && s.isActive && <button onClick={() => suspend(s._id)} className="text-xs text-red-500 font-medium hover:underline">Suspend</button>}
                    <button onClick={() => setSelected(s)} className="p-1 hover:bg-gray-100 rounded"><HiOutlineEye className="w-4 h-4 text-gray-400" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Store detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-4">{selected.storeName}</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              {[['Owner', selected.ownerName], ['Email', selected.email], ['Phone', selected.phone], ['City', selected.address?.city],
                ['DL#', selected.drugLicenseNumber], ['GST', selected.gstNumber], ['Plan', selected.plan],
                ['Max Products', selected.maxProducts === Infinity ? '∞' : selected.maxProducts],
                ['Max Staff', selected.maxStaff === Infinity ? '∞' : selected.maxStaff],
                ['Plan Expiry', selected.planEndDate ? formatDate(selected.planEndDate) : '—'],
              ].map(([k, v]) => <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-medium">{v || '—'}</p></div>)}
            </div>
            <button onClick={() => setSelected(null)} className="btn-secondary mt-4 w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
