import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePrinter, HiOutlineBan, HiOutlineReceiptRefund, HiOutlineArrowLeft } from 'react-icons/hi';

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/sales/${id}`).then(res => {
      setSale(res.data.data.sale);
      setStore(res.data.data.store);
    }).catch(() => navigate('/sales')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  if (!sale) return null;

  const statusColor = {
    completed: 'badge-green', voided: 'badge-red', returned: 'badge-gray', partial_return: 'badge-blue',
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/sales')} className="btn-ghost text-sm mb-4 flex items-center gap-1">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Sales
      </button>

      {/* Receipt Card */}
      <div className="card" id="receipt-print">
        {/* Store Header */}
        <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
          <h2 className="font-heading font-bold text-xl">{store?.storeName}</h2>
          {store?.address && <p className="text-xs text-gray-500">{store.address.street}, {store.address.city}</p>}
          {store?.phone && <p className="text-xs text-gray-500">Phone: {store.phone}</p>}
          {store?.drugLicenseNumber && <p className="text-xs text-gray-400">DL: {store.drugLicenseNumber}</p>}
          {store?.gstNumber && <p className="text-xs text-gray-400">GST: {store.gstNumber}</p>}
        </div>

        {/* Invoice Info */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-gray-500">Invoice No.</p>
            <p className="font-mono font-bold text-lg text-primary-700">{sale.invoiceNo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Date</p>
            <p className="text-sm font-medium">{formatDateTime(sale.createdAt)}</p>
          </div>
        </div>

        <div className="flex justify-between text-sm text-gray-600 mb-4 pb-3 border-b border-gray-100">
          <div>
            <span className="text-xs text-gray-400">Customer: </span>
            <span className="font-medium">{sale.customerName}</span>
            {sale.customerPhone && <span className="text-xs text-gray-400 ml-2">{sale.customerPhone}</span>}
          </div>
          <div>
            <span className="text-xs text-gray-400">Cashier: </span>
            <span>{sale.cashierName}</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`badge ${statusColor[sale.status] || 'badge-gray'}`}>{sale.status.toUpperCase()}</span>
          {sale.isControlledDrugSale && <span className="badge badge-red">Controlled Drug</span>}
          {sale.hasReturns && <span className="badge badge-blue">Has Returns</span>}
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b-2 border-gray-200 text-xs text-gray-500 uppercase">
              <th className="text-left py-2">Item</th>
              <th className="text-center py-2">Qty</th>
              <th className="text-right py-2">Price</th>
              <th className="text-right py-2">Disc</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sale.items?.map((item, i) => (
              <tr key={i}>
                <td className="py-2">
                  <p className="font-medium">{item.medicineName}</p>
                  <p className="text-[10px] text-gray-400">Batch: {item.batchNumber} | Exp: {formatDate(item.expiryDate)}</p>
                </td>
                <td className="text-center py-2">{item.quantity}</td>
                <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                <td className="text-right py-2 text-red-500">{item.discount > 0 ? `-${formatCurrency(item.discount)}` : '—'}</td>
                <td className="text-right py-2 font-semibold">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t-2 border-dashed border-gray-300 pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
          {sale.discountTotal > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-{formatCurrency(sale.discountTotal)}</span></div>}
          {sale.taxTotal > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>+{formatCurrency(sale.taxTotal)}</span></div>}
          {sale.roundOff !== 0 && <div className="flex justify-between text-xs text-gray-400"><span>Round Off</span><span>{formatCurrency(sale.roundOff)}</span></div>}
          <div className="flex justify-between text-lg font-heading font-bold border-t-2 border-gray-200 pt-2">
            <span>NET TOTAL</span><span className="text-primary-700">{formatCurrency(sale.netTotal)}</span>
          </div>
        </div>

        {/* Payments */}
        <div className="mt-4 pt-3 border-t border-dashed border-gray-300">
          <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Payment Details</p>
          {sale.payments?.map((p, i) => (
            <div key={i} className="flex justify-between text-sm mb-1">
              <span className="capitalize">{p.method} {p.reference && <span className="text-xs text-gray-400">({p.reference})</span>}</span>
              <span className="font-medium">{formatCurrency(p.amount)}</span>
            </div>
          ))}
          {sale.changeGiven > 0 && (
            <div className="flex justify-between text-sm font-medium text-primary-600 mt-1">
              <span>Change Given</span><span>{formatCurrency(sale.changeGiven)}</span>
            </div>
          )}
          {sale.balanceDue > 0 && (
            <div className="flex justify-between text-sm font-medium text-red-600 mt-1">
              <span>Balance Due</span><span>{formatCurrency(sale.balanceDue)}</span>
            </div>
          )}
        </div>

        {/* Void Info */}
        {sale.status === 'voided' && (
          <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-sm text-red-700 font-medium">VOIDED</p>
            <p className="text-xs text-red-500">Reason: {sale.voidReason}</p>
            <p className="text-xs text-red-400">At: {formatDateTime(sale.voidedAt)}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-dashed border-gray-300 text-center">
          <p className="text-xs text-gray-400">{store?.settings?.receiptFooter || 'Thank you for your purchase!'}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 justify-end">
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-1.5">
          <HiOutlinePrinter className="w-4 h-4" /> Print Receipt
        </button>
        {sale.status === 'completed' && (
          <button onClick={() => navigate(`/sales/${id}/return`)} className="btn-secondary flex items-center gap-1.5 text-blue-600 border-blue-200">
            <HiOutlineReceiptRefund className="w-4 h-4" /> Process Return
          </button>
        )}
      </div>
    </div>
  );
}
