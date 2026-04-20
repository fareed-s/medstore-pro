import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlineArrowLeft } from 'react-icons/hi';

const RETURN_REASONS = ['Wrong medicine', 'Expired product', 'Damaged packaging', 'Customer changed mind', 'Allergic reaction', 'Doctor changed prescription', 'Duplicate purchase', 'Other'];

export default function SaleReturnPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnItems, setReturnItems] = useState([]);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    API.get(`/sales/${id}`).then(res => {
      const s = res.data.data.sale;
      setSale(s);
      setReturnItems(s.items.map(i => ({ ...i, returnQty: 0, selected: false })));
    }).catch(() => navigate('/sales')).finally(() => setLoading(false));
  }, [id]);

  const toggleItem = (idx) => {
    setReturnItems(items => items.map((item, i) => {
      if (i === idx) return { ...item, selected: !item.selected, returnQty: !item.selected ? item.quantity : 0 };
      return item;
    }));
  };

  const updateReturnQty = (idx, qty) => {
    setReturnItems(items => items.map((item, i) => {
      if (i === idx) return { ...item, returnQty: Math.min(Math.max(0, parseInt(qty) || 0), item.quantity) };
      return item;
    }));
  };

  const selectedItems = returnItems.filter(i => i.selected && i.returnQty > 0);
  const refundAmount = selectedItems.reduce((sum, i) => sum + (i.unitPrice * i.returnQty), 0);

  const processReturn = async () => {
    if (selectedItems.length === 0) return toast.warning('Select items to return');
    if (!reason) return toast.warning('Select a return reason');
    setProcessing(true);
    try {
      await API.post(`/sales/${id}/return`, {
        items: selectedItems.map(i => ({
          medicineId: i.medicineId._id || i.medicineId,
          quantity: i.returnQty,
          restockBatch: true,
        })),
        reason, refundMethod, notes,
      });
      toast.success('Return processed successfully');
      navigate(`/sales/${id}`);
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } finally { setProcessing(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  if (!sale) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(`/sales/${id}`)} className="btn-ghost text-sm mb-4 flex items-center gap-1">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Sale
      </button>

      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Process Return</h1>
      <p className="text-gray-500 text-sm mb-6">Invoice: <span className="font-mono font-bold">{sale.invoiceNo}</span> • {sale.customerName}</p>

      {/* Items Selection */}
      <div className="card mb-4">
        <h3 className="font-heading font-semibold text-gray-900 mb-3">Select Items to Return</h3>
        <div className="space-y-2">
          {returnItems.map((item, idx) => (
            <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${item.selected ? 'border-primary-300 bg-primary-50/50' : 'border-gray-100 hover:border-gray-200'}`}
              onClick={() => toggleItem(idx)}>
              <input type="checkbox" checked={item.selected} onChange={() => {}} className="w-4 h-4 text-primary-600 rounded" />
              <div className="flex-1">
                <p className="font-medium text-sm">{item.medicineName}</p>
                <p className="text-xs text-gray-400">Sold: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
              </div>
              {item.selected && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Return Qty:</label>
                  <input type="number" min="1" max={item.quantity} value={item.returnQty}
                    onChange={(e) => updateReturnQty(idx, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm" />
                </div>
              )}
              <span className="font-bold text-sm">
                {item.selected ? formatCurrency(item.unitPrice * item.returnQty) : formatCurrency(item.lineTotal)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Return Details */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Return Reason *</label>
            <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select reason...</option>
              {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Refund Method</label>
            <select className="input-field" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
              <option value="cash">Cash Refund</option>
              <option value="credit_note">Credit Note</option>
              <option value="exchange">Exchange</option>
              <option value="card_refund">Card Refund</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="label">Notes</label>
          <textarea className="input-field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
        </div>
      </div>

      {/* Refund Summary */}
      <div className="card bg-red-50/50 border-red-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Refund Amount</p>
            <p className="text-2xl font-heading font-bold text-red-600">{formatCurrency(refundAmount)}</p>
            <p className="text-xs text-gray-400">{selectedItems.length} items selected</p>
          </div>
          <button onClick={processReturn} disabled={processing || selectedItems.length === 0}
            className="btn-danger px-6 py-3 text-base disabled:opacity-30">
            {processing ? 'Processing...' : 'Process Return'}
          </button>
        </div>
      </div>
    </div>
  );
}
