import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { HiOutlineOfficeBuilding, HiOutlineUsers, HiOutlineCube, HiOutlineCheck, HiOutlineClock } from 'react-icons/hi';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/superadmin/stats'),
      API.get('/superadmin/stores?limit=10'),
    ]).then(([statsRes, storesRes]) => {
      setData(statsRes.data.data);
      setStores(storesRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const approveStore = async (id) => {
    await API.put(`/superadmin/stores/${id}/approve`);
    setStores(stores.map(s => s._id === id ? { ...s, isApproved: true } : s));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-6">Platform Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Stores', value: data?.totalStores, icon: HiOutlineOfficeBuilding, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Active Stores', value: data?.activeStores, icon: HiOutlineCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending Approval', value: data?.pendingApproval, icon: HiOutlineClock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Users', value: data?.totalUsers, icon: HiOutlineUsers, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-heading font-bold text-gray-900">{s.value || 0}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-heading font-semibold text-gray-900 mb-4">Recent Stores</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Store</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {stores.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium">{s.storeName}<p className="text-xs text-gray-400">{s.email}</p></td>
                  <td className="px-4 py-3 text-gray-500">{s.ownerName}</td>
                  <td className="px-4 py-3"><span className="badge badge-blue">{s.plan}</span></td>
                  <td className="px-4 py-3">
                    <span className={`badge ${s.isApproved ? 'badge-green' : 'badge-amber'}`}>{s.isApproved ? 'Active' : 'Pending'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {!s.isApproved && <button onClick={() => approveStore(s._id)} className="text-primary-600 hover:underline text-sm font-medium">Approve</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
