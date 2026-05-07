// Sales register for the hidden module — list past sales, search/filter,
// open detail to re-print the receipt, void if StoreAdmin.

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  HiOutlineSearch, HiOutlinePrinter, HiOutlineBan, HiOutlineRefresh,
  HiOutlineDocumentText,
} from 'react-icons/hi';
import { controlledApi } from '../../context/ControlledModuleContext';
import { useAuth } from '../../context/AuthContext';
import { apiError, formatCurrency, formatDateTime } from '../../utils/helpers';
import { confirmDanger } from '../../utils/swal';
import ControlledReceipt from './ControlledReceipt';

const SCHEDULE_BADGE = {
  'Schedule-H':  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Schedule-H1': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Schedule-X':  'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function ControlledSalesPage() {
  const { user } = useAuth();
  const isAdmin = ['StoreAdmin', 'SuperAdmin'].includes(user?.role);

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState(null);    // currently-viewed sale (for receipt)

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (from)   params.set('from', from);
      if (to)     params.set('to', to);
      const { data } = await controlledApi.get(`/sales?${params}`);
      setSales(data.data);
    } catch (err) {
      toast.error(apiError(err, 'Failed to load sales'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchData, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, from, to]);

  const voidSale = async (sale) => {
    const ok = await confirmDanger(
      `Invoice ${sale.invoiceNo} will be marked as voided. Stock is NOT auto-restocked.`,
      { title: 'Void this sale?', confirmText: 'Void' }
    );
    if (!ok) return;
    try {
      await controlledApi.post(`/sales/${sale._id}/void`, { reason: 'StoreAdmin manual void' });
      toast.success('Sale voided');
      fetchData();
    } catch (err) {
      toast.error(apiError(err, 'Void failed'));
    }
  };

  const totalRevenue = sales.filter((s) => !s.isVoided).reduce((sum, s) => sum + (s.total || 0), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Sales Register</h1>
          <p className="text-sm text-gray-400">{sales.length} sale(s) · {formatCurrency(totalRevenue)} revenue</p>
        </div>
        <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 text-sm flex items-center gap-1.5 self-start">
          <HiOutlineRefresh className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="relative sm:col-span-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Invoice / patient / doctor / phone"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500/50"
          />
        </div>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-100 focus:outline-none focus:border-red-500/50" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-100 focus:outline-none focus:border-red-500/50" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <HiOutlineDocumentText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No sales in this date range.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3 hidden md:table-cell">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 hidden sm:table-cell">Cashier</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {sales.map((s) => (
                <tr key={s._id} className={`hover:bg-gray-800/40 ${s.isVoided ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-gray-100">{s.invoiceNo}</p>
                    <p className="text-[11px] text-gray-500">{formatDateTime(s.createdAt)}</p>
                    {s.isVoided && <span className="text-[10px] text-red-400 font-semibold">VOIDED</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{s.patient?.name || <span className="text-gray-500">—</span>}</p>
                    <p className="text-[11px] text-gray-500 truncate max-w-[180px]">
                      {s.patient?.phone || s.patient?.cnic || ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-gray-300 text-xs">
                      {(s.items || []).slice(0, 2).map((it) => it.medicineName).join(', ')}
                      {s.items?.length > 2 ? ` +${s.items.length - 2}` : ''}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {[...new Set((s.items || []).map((i) => i.schedule))].map((sch) => (
                        <span key={sch} className={`badge text-[9px] border ${SCHEDULE_BADGE[sch] || ''}`}>{sch}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-100 font-mono">{formatCurrency(s.total)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">{s.soldByName}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setOpen(s)} title="View / re-print" className="p-1.5 rounded hover:bg-blue-500/15 text-blue-400">
                        <HiOutlinePrinter className="w-4 h-4" />
                      </button>
                      {isAdmin && !s.isVoided && (
                        <button onClick={() => voidSale(s)} title="Void" className="p-1.5 rounded hover:bg-red-500/15 text-red-400">
                          <HiOutlineBan className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <ControlledReceipt sale={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
