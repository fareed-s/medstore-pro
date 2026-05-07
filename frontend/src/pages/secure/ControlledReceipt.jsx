// Printable receipt for a completed controlled-drug sale.
//
// Renders inside a fixed overlay so the operator can review + print + close.
// Print styles in this file's <style> block hide chrome and white-out the
// dark theme just for window.print() — the regulator wants a clean black-on-
// white receipt regardless of how the screen looks.

import { useEffect, useRef } from 'react';
import { HiOutlineX, HiOutlinePrinter } from 'react-icons/hi';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

export default function ControlledReceipt({ sale, onClose }) {
  const ref = useRef(null);
  const { user } = useAuth();
  const store = user?.subscription;     // store name + currency hint comes from /auth/me

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!sale) return null;

  const print = () => window.print();

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto print:bg-white print:p-0">
      <div className="bg-white rounded-2xl w-full max-w-md my-4 sm:my-8 overflow-hidden shadow-2xl print:rounded-none print:shadow-none print:max-w-full print:my-0">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 flex items-center gap-3 print:hidden">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Sale Complete</p>
            <p className="text-[11px] text-gray-300 truncate">{sale.invoiceNo}</p>
          </div>
          <button onClick={print} className="px-3 py-1.5 rounded-lg bg-white text-gray-900 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-100">
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div ref={ref} className="p-5 text-gray-900 text-sm font-mono">
          {/* Header */}
          <div className="text-center mb-3 border-b border-dashed border-gray-300 pb-3">
            <p className="font-bold text-base uppercase tracking-wider">{store?.storeName || 'Pharmacy'}</p>
            <p className="text-xs uppercase tracking-widest text-red-700 font-bold mt-1">CONTROLLED DRUG SALE</p>
            <p className="text-[10px] text-gray-600">Schedule-H / H1 / X register</p>
          </div>

          {/* Invoice meta */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] mb-3">
            <p><span className="text-gray-500">Invoice:</span> <b>{sale.invoiceNo}</b></p>
            <p className="text-right"><span className="text-gray-500">Date:</span> {formatDateTime(sale.createdAt)}</p>
            <p><span className="text-gray-500">Cashier:</span> {sale.soldByName}</p>
            {sale.paymentMethod && <p className="text-right capitalize"><span className="text-gray-500">Pay:</span> {sale.paymentMethod}</p>}
          </div>

          {/* Patient & Doctor — only render rows that have data */}
          {(sale.patient?.name || sale.doctor?.name) && (
            <div className="border border-gray-200 rounded p-2 mb-3 text-[11px] space-y-1">
              {sale.patient?.name && (
                <p>
                  <span className="text-gray-500">Patient:</span> <b>{sale.patient.name}</b>
                  {sale.patient.age ? `, ${sale.patient.age}y` : ''}
                  {sale.patient.gender ? `, ${sale.patient.gender}` : ''}
                </p>
              )}
              {sale.patient?.phone && <p><span className="text-gray-500">Phone:</span> {sale.patient.phone}</p>}
              {sale.patient?.cnic && <p><span className="text-gray-500">CNIC:</span> {sale.patient.cnic}</p>}
              {sale.patient?.address && <p><span className="text-gray-500">Address:</span> {sale.patient.address}</p>}
              {sale.doctor?.name && (
                <p>
                  <span className="text-gray-500">Dr.:</span> <b>{sale.doctor.name}</b>
                  {sale.doctor.registrationNumber ? ` · Reg. ${sale.doctor.registrationNumber}` : ''}
                </p>
              )}
              {sale.doctor?.prescriptionDate && (
                <p><span className="text-gray-500">Rx Date:</span> {formatDate(sale.doctor.prescriptionDate)}</p>
              )}
            </div>
          )}

          {/* Items */}
          <table className="w-full text-[11px] mb-3 border-t border-dashed border-gray-300 pt-2">
            <thead>
              <tr className="text-left">
                <th className="py-1">Item</th>
                <th className="text-center w-10">Qty</th>
                <th className="text-right w-16">Rate</th>
                <th className="text-right w-20">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it, i) => (
                <tr key={i} className="align-top border-t border-dotted border-gray-200">
                  <td className="py-1">
                    <p className="font-semibold">{it.medicineName}</p>
                    <p className="text-[10px] text-gray-600">
                      {it.schedule} · Batch {it.batchNumber}
                      {it.expiryDate ? ` · Exp ${formatDate(it.expiryDate)}` : ''}
                    </p>
                  </td>
                  <td className="text-center">{it.quantity}</td>
                  <td className="text-right">{Number(it.unitPrice).toFixed(2)}</td>
                  <td className="text-right">{Number(it.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-300 pt-2 space-y-0.5 text-[11px]">
            <Row label="Subtotal" value={formatCurrency(sale.subtotal)} />
            {sale.discount > 0 && <Row label="Discount" value={`− ${formatCurrency(sale.discount)}`} />}
            {sale.tax > 0 && <Row label="Tax" value={formatCurrency(sale.tax)} />}
            <Row label="Total" value={formatCurrency(sale.total)} bold />
            {sale.amountPaid > 0 && <Row label="Paid" value={formatCurrency(sale.amountPaid)} />}
            {sale.changeReturned > 0 && <Row label="Change" value={formatCurrency(sale.changeReturned)} />}
          </div>

          {sale.notes && (
            <p className="mt-2 text-[10px] italic text-gray-700">Note: {sale.notes}</p>
          )}

          <div className="mt-4 pt-3 border-t border-dashed border-gray-300 text-center text-[10px] text-gray-600">
            <p>This receipt is part of the legal narcotic register.</p>
            <p>Retain for inspection.</p>
          </div>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 print:hidden">
          <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          <button onClick={print} className="btn-primary text-sm flex items-center gap-1.5">
            <HiOutlinePrinter className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          /* Hide everything except the receipt itself. */
          body > #root > * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          /* Re-show the receipt overlay tree. */
          [class*="z-[100]"], [class*="z-[100]"] * { visibility: visible !important; }
          [class*="z-[100]"] { position: static !important; padding: 0 !important; background: white !important; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-sm border-t border-gray-300 pt-1 mt-1' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
