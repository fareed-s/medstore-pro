import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { HiOutlineShieldCheck } from 'react-icons/hi';

export default function InsuranceClaimsPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/customers?type=insurance&limit=100').then(r => setCustomers(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Insurance Panel</h1>
      <p className="text-gray-500 text-sm mb-6">Manage insurance customers and claims</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card"><div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center"><HiOutlineShieldCheck className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-gray-500">Insurance Customers</p><p className="text-xl font-heading font-bold">{customers.length}</p></div></div>
        <div className="card text-center py-3"><p className="text-xs text-gray-500">Feature Status</p><p className="text-sm font-medium text-amber-600 mt-1">Basic — Insurance fields on customer profile</p></div>
        <div className="card text-center py-3"><p className="text-xs text-gray-500">Co-Pay at POS</p><p className="text-sm font-medium text-green-600 mt-1">Auto-calculated when customer selected</p></div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="px-5 py-3 border-b"><h3 className="font-heading font-semibold">Insurance Customers</h3></div>
        {customers.length === 0 ? <p className="text-center py-8 text-gray-400">No insurance customers. Add via Customer → Type: Insurance</p> : (
          <table className="w-full text-sm">
            <thead><tr className="table-header"><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Insurance Co.</th><th className="px-4 py-3">Policy #</th><th className="px-4 py-3">Co-Pay %</th><th className="px-4 py-3">Plan</th></tr></thead>
            <tbody className="divide-y divide-gray-50">{customers.map(c => (
              <tr key={c._id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2"><p className="font-medium">{c.customerName}</p><p className="text-xs text-gray-400">{c.phone}</p></td>
                <td className="px-4 py-2">{c.insuranceDetails?.company || '—'}</td>
                <td className="px-4 py-2 font-mono text-xs">{c.insuranceDetails?.policyNumber || '—'}</td>
                <td className="px-4 py-2 font-bold">{c.insuranceDetails?.coPayPercent || 0}%</td>
                <td className="px-4 py-2 text-xs">{c.insuranceDetails?.planType || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
