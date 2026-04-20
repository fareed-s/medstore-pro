import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlineCreditCard } from 'react-icons/hi';

const PLANS = [
  { name: 'Free Trial', price: 0, duration: '14 days', products: 100, staff: 2, features: 'Basic POS, Inventory' },
  { name: 'Starter', price: 2999, duration: 'Monthly', products: 500, staff: 3, features: 'POS, Inventory, Reports' },
  { name: 'Professional', price: 5999, duration: 'Monthly', products: 5000, staff: 10, features: 'All features' },
  { name: 'Premium', price: 9999, duration: 'Monthly', products: 'Unlimited', staff: 'Unlimited', features: 'All + Multi-branch + Priority Support' },
  { name: 'Enterprise', price: 19999, duration: 'Monthly', products: 'Unlimited', staff: 'Unlimited', features: 'Custom + API + Dedicated Support' },
];

export default function AdminSubscriptionsPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/superadmin/stores?limit=100').then(r => setStores(r.data.data)).finally(() => setLoading(false));
  }, []);

  const changePlan = async (storeId, plan) => {
    try {
      await API.put(`/superadmin/stores/${storeId}/plan`, { plan });
      toast.success(`Plan changed to ${plan}`);
      const { data } = await API.get('/superadmin/stores?limit=100');
      setStores(data.data);
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const planCounts = {};
  stores.forEach(s => { planCounts[s.plan] = (planCounts[s.plan] || 0) + 1; });

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Subscription Management</h1>
      <p className="text-gray-500 text-sm mb-6">Manage store plans and billing</p>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {PLANS.map(plan => (
          <div key={plan.name} className={`card text-center py-4 ${plan.name === 'Premium' ? 'border-2 border-primary-300 bg-primary-50/30' : ''}`}>
            <p className="text-xs text-gray-500 uppercase font-semibold">{plan.name}</p>
            <p className="text-2xl font-heading font-bold text-primary-700 mt-1">{plan.price === 0 ? 'Free' : `Rs.${plan.price.toLocaleString()}`}</p>
            <p className="text-[10px] text-gray-400">{plan.duration}</p>
            <p className="text-xs text-gray-500 mt-2">Products: {plan.products}</p>
            <p className="text-xs text-gray-500">Staff: {plan.staff}</p>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className="badge badge-blue text-[10px]">{planCounts[plan.name] || 0} stores</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stores + plan management */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-3 border-b"><h3 className="font-heading font-semibold">Store Plans</h3></div>
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Store</th><th className="px-4 py-3">Current Plan</th><th className="px-4 py-3 hidden md:table-cell">Expiry</th><th className="px-4 py-3">Change Plan</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {stores.map(s => (
                <tr key={s._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3"><p className="font-medium">{s.storeName}</p><p className="text-xs text-gray-400">{s.ownerName}</p></td>
                  <td className="px-4 py-3"><span className={`badge ${s.plan === 'Premium' ? 'badge-blue' : s.plan === 'Enterprise' ? 'badge-green' : s.plan === 'Free Trial' ? 'badge-amber' : 'badge-gray'}`}>{s.plan}</span></td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400">{s.planEndDate ? formatDate(s.planEndDate) : '—'}</td>
                  <td className="px-4 py-3">
                    <select className="input-field text-xs py-1 w-36" value={s.plan} onChange={(e) => changePlan(s._id, e.target.value)}>
                      {PLANS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
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
