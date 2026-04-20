import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlineArrowLeft, HiOutlinePaperAirplane, HiOutlineBan, HiOutlineInboxIn } from 'react-icons/hi';

export default function PODetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/purchase/orders/${id}`).then(r => setPo(r.data.data)).catch(() => navigate('/purchase/orders')).finally(() => setLoading(false));
  }, [id]);

  const sendPO = async () => { await API.post(`/purchase/orders/${id}/send`); toast.success('PO sent'); setPo({ ...po, status: 'sent' }); };
  const cancelPO = async () => { const r = prompt('Cancel reason:'); if (!r) return; await API.post(`/purchase/orders/${id}/cancel`, { reason: r }); toast.success('Cancelled'); setPo({ ...po, status: 'cancelled' }); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  if (!po) return null;

  const statusBadge = { draft: 'badge-gray', sent: 'badge-blue', partial: 'badge-amber', received: 'badge-green', cancelled: 'badge-red' };

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/purchase/orders')} className="btn-ghost text-sm mb-4 flex items-center gap-1"><HiOutlineArrowLeft className="w-4 h-4" /> Back</button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-heading font-bold">{po.poNumber}</h1><span className={`badge ${statusBadge[po.status]}`}>{po.status}</span></div>
          <p className="text-gray-500">{po.supplierName} • Created {formatDate(po.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          {po.status === 'draft' && <button onClick={sendPO} className="btn-primary flex items-center gap-1 text-sm"><HiOutlinePaperAirplane className="w-4 h-4" /> Send</button>}
          {['sent', 'partial'].includes(po.status) && <Link to={`/purchase/grn?poId=${po._id}`} className="btn-primary flex items-center gap-1 text-sm"><HiOutlineInboxIn className="w-4 h-4" /> Create GRN</Link>}
          {['draft', 'sent'].includes(po.status) && <button onClick={cancelPO} className="btn-danger flex items-center gap-1 text-sm"><HiOutlineBan className="w-4 h-4" /> Cancel</button>}
        </div>
      </div>

      {/* Items */}
      <div className="card mb-4">
        <h3 className="font-heading font-semibold text-gray-900 mb-3">Order Items ({po.items?.length})</h3>
        <table className="w-full text-sm">
          <thead><tr className="table-header">
            <th className="px-4 py-2">Medicine</th><th className="px-4 py-2 text-center">Ordered</th><th className="px-4 py-2 text-center">Received</th>
            <th className="px-4 py-2 text-right">Unit Cost</th><th className="px-4 py-2 text-right">Tax</th><th className="px-4 py-2 text-right">Total</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {po.items?.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-4 py-2"><p className="font-medium">{item.medicineName}</p><p className="text-xs text-gray-400">{item.genericName}</p></td>
                <td className="px-4 py-2 text-center font-semibold">{item.quantity}</td>
                <td className="px-4 py-2 text-center"><span className={item.receivedQty >= item.quantity ? 'text-green-600 font-bold' : item.receivedQty > 0 ? 'text-amber-600 font-bold' : 'text-gray-400'}>{item.receivedQty || 0}</span></td>
                <td className="px-4 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(item.tax)}</td>
                <td className="px-4 py-2 text-right font-bold">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="card max-w-sm ml-auto">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(po.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatCurrency(po.taxTotal)}</span></div>
          {po.discountTotal > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-{formatCurrency(po.discountTotal)}</span></div>}
          {po.shippingCost > 0 && <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatCurrency(po.shippingCost)}</span></div>}
          <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Grand Total</span><span className="text-primary-700">{formatCurrency(po.grandTotal)}</span></div>
        </div>
      </div>

      {po.notes && <div className="card mt-4"><p className="text-sm text-gray-600"><b>Notes:</b> {po.notes}</p></div>}
    </div>
  );
}
