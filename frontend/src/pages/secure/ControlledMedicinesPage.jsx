// List of controlled / narcotic drugs in the hidden module's vault.
// Search, schedule filter, low-stock filter, add new, edit, soft-delete.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencilAlt, HiOutlineTrash,
  HiOutlineExclamation, HiOutlineCube, HiOutlineRefresh,
} from 'react-icons/hi';
import { controlledApi } from '../../context/ControlledModuleContext';
import { apiError, formatCurrency, formatDate } from '../../utils/helpers';
import { confirmDanger } from '../../utils/swal';

const SCHEDULE_BADGE = {
  'Schedule-H':  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Schedule-H1': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Schedule-X':  'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function ControlledMedicinesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schedule, setSchedule] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (schedule) params.set('schedule', schedule);
      if (lowStockOnly) params.set('lowStock', 'true');
      const { data } = await controlledApi.get(`/medicines?${params}`);
      setItems(data.data);
    } catch (err) {
      toast.error(apiError(err, 'Failed to load medicines'));
    } finally {
      setLoading(false);
    }
  };

  // Debounce searches so we don't hammer the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(fetchData, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, schedule, lowStockOnly]);

  const remove = async (m) => {
    const ok = await confirmDanger(
      `${m.medicineName} ki recordkeeping retain rahegi (sales history etc.) — sirf catalog se hide hoga.`,
      { title: 'Archive this medicine?', confirmText: 'Archive', cancelText: 'Cancel' }
    );
    if (!ok) return;
    try {
      await controlledApi.delete(`/medicines/${m._id}`);
      toast.success('Archived');
      fetchData();
    } catch (err) {
      toast.error(apiError(err, 'Failed to archive'));
    }
  };

  const totalStock = items.reduce((s, m) => s + (m.currentStock || 0), 0);
  const lowCount = items.filter((m) => m.currentStock <= (m.lowStockThreshold || 0)).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Controlled Medicines</h1>
          <p className="text-sm text-gray-400">Narcotic / scheduled drugs catalog · {items.length} item(s) · {totalStock} units in stock</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 text-sm flex items-center gap-1.5">
            <HiOutlineRefresh className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => navigate('/secure/medicines/new')}
            className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-1.5"
          >
            <HiOutlinePlus className="w-4 h-4" /> Add Medicine
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name / generic / manufacturer"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500/50"
          />
        </div>
        <select
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-100 text-sm focus:outline-none focus:border-red-500/50"
        >
          <option value="">All schedules</option>
          <option value="Schedule-H">Schedule-H</option>
          <option value="Schedule-H1">Schedule-H1</option>
          <option value="Schedule-X">Schedule-X</option>
        </select>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm text-gray-200 cursor-pointer">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock {lowCount > 0 && <span className="text-amber-400 text-xs">({lowCount})</span>}
        </label>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <HiOutlineCube className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No controlled medicines yet.</p>
            <p className="text-xs mt-1">Click "Add Medicine" to enter the first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <th className="px-4 py-3">Medicine</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 hidden md:table-cell">Earliest Expiry</th>
                <th className="px-4 py-3 text-right">Sale Price</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {items.map((m) => (
                <Row key={m._id} m={m} onEdit={() => navigate(`/secure/medicines/${m._id}/edit`)} onDelete={() => remove(m)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({ m, onEdit, onDelete }) {
  const earliest = (m.batches || [])
    .map((b) => new Date(b.expiryDate))
    .sort((a, b) => a - b)[0];

  const isLow = m.currentStock <= (m.lowStockThreshold || 0);

  return (
    <tr className={`hover:bg-gray-800/40 ${!m.isActive ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3">
        <p className="font-medium text-gray-100">{m.medicineName}</p>
        <p className="text-xs text-gray-500">
          {[m.genericName, m.manufacturer, m.strength].filter(Boolean).join(' · ') || '—'}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className={`badge border ${SCHEDULE_BADGE[m.schedule] || 'bg-gray-800 text-gray-300 border-gray-700'}`}>
          {m.schedule}
        </span>
        {!m.isActive && <p className="text-[10px] text-gray-500 mt-0.5">archived</p>}
      </td>
      <td className="px-4 py-3 text-right">
        <p className={`font-mono font-semibold ${isLow ? 'text-amber-400' : 'text-gray-100'}`}>
          {m.currentStock || 0}
        </p>
        <p className="text-[11px] text-gray-500">{m.unitOfMeasure || ''}</p>
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
        {earliest ? formatDate(earliest) : '—'}
        {(m.batches || []).length > 0 && (
          <p className="text-[10px] text-gray-500">{m.batches.length} batch(es)</p>
        )}
      </td>
      <td className="px-4 py-3 text-right text-gray-200 font-mono">
        {formatCurrency(m.defaultSalePrice)}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <button onClick={onEdit} title="Edit" className="p-1.5 rounded hover:bg-blue-500/15 text-blue-400">
            <HiOutlinePencilAlt className="w-4 h-4" />
          </button>
          {m.isActive && (
            <button onClick={onDelete} title="Archive" className="p-1.5 rounded hover:bg-red-500/15 text-red-400">
              <HiOutlineTrash className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
