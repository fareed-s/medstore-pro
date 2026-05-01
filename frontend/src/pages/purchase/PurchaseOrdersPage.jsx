import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { HiOutlinePlus } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { apiError } from '../../utils/helpers';
import Spinner from '../../shared/components/Spinner';
import PurchaseOrderRow from './components/PurchaseOrderRow';

const FILTERS = ['', 'draft', 'sent', 'partial', 'received', 'cancelled'];

export default function PurchaseOrdersPage() {
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    try { const { data } = await API.get(`/purchase/orders${params}`); setOrders(data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const sendPO = useCallback(async (id) => {
    try { await API.post(`/purchase/orders/${id}/send`); toast.success('PO marked as sent'); fetchOrders(); }
    catch (err) { toast.error(apiError(err)); }
  }, [fetchOrders]);

  const cancelPO = useCallback(async (id) => {
    const reason = window.prompt('Cancel reason:');
    if (!reason) return;
    try { await API.post(`/purchase/orders/${id}/cancel`, { reason }); toast.success('PO cancelled'); fetchOrders(); }
    catch (err) { toast.error(apiError(err)); }
  }, [fetchOrders]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500 text-sm">{orders.length} orders</p>
        </div>
        {hasRole('SuperAdmin', 'StoreAdmin') && (
          <Link to="/purchase/orders/new" className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> New PO
          </Link>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? <Spinner />
          : orders.length === 0
            ? <div className="text-center py-12 text-gray-400">No purchase orders found</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-3">PO #</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3 hidden md:table-cell">Items</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Date</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.map((po) => <PurchaseOrderRow key={po._id} order={po} onSend={sendPO} onCancel={cancelPO} />)}
                  </tbody>
                </table>
              </div>
            )}
      </div>
    </div>
  );
}
