import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineEye, HiOutlinePaperAirplane, HiOutlineBan, HiOutlineSearch } from 'react-icons/hi';

export default function PurchaseOrdersPage() {
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    try { const { data } = await API.get(`/purchase/orders${params}`); setOrders(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const sendPO = async (id) => {
    try { await API.post(`/purchase/orders/${id}/send`); toast.success('PO marked as sent'); fetchOrders(); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const cancelPO = async (id) => {
    const reason = window.prompt('Cancel reason:');
    if (!reason) return;
    try { await API.post(`/purchase/orders/${id}/cancel`, { reason }); toast.success('PO cancelled'); fetchOrders(); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const statusBadge = { draft: 'badge-gray', sent: 'badge-blue', partial: 'badge-amber', received: 'badge-green', cancelled: 'badge-red' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-gray-900">Purchase Orders</h1><p className="text-gray-500 text-sm">{orders.length} orders</p></div>
        {hasRole('SuperAdmin', 'StoreAdmin') && (
          <Link to="/purchase/orders/new" className="btn-primary flex items-center gap-2"><HiOutlinePlus className="w-4 h-4" /> New PO</Link>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'draft', 'sent', 'partial', 'received', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No purchase orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-3">PO #</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3 hidden md:table-cell">Items</th>
                <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden lg:table-cell">Date</th><th className="px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(po => (
                  <tr key={po._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-primary-600">{po.poNumber}</td>
                    <td className="px-4 py-3 font-medium">{po.supplierName || po.supplierId?.supplierName}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">{po.items?.length}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(po.grandTotal)}</td>
                    <td className="px-4 py-3"><span className={`badge ${statusBadge[po.status]}`}>{po.status}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDate(po.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link to={`/purchase/orders/${po._id}`} className="p-1.5 hover:bg-gray-100 rounded-lg"><HiOutlineEye className="w-4 h-4 text-gray-500" /></Link>
                        {po.status === 'draft' && hasRole('SuperAdmin', 'StoreAdmin') && (
                          <button onClick={() => sendPO(po._id)} className="p-1.5 hover:bg-blue-50 rounded-lg" title="Mark as Sent"><HiOutlinePaperAirplane className="w-4 h-4 text-blue-500" /></button>
                        )}
                        {['draft', 'sent'].includes(po.status) && hasRole('SuperAdmin', 'StoreAdmin') && (
                          <button onClick={() => cancelPO(po._id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Cancel"><HiOutlineBan className="w-4 h-4 text-red-400" /></button>
                        )}
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
