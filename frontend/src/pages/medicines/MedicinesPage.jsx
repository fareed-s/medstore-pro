import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, getStockStatus, getScheduleBadge, CATEGORIES, SCHEDULES } from '../../utils/helpers';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineFilter, HiOutlineRefresh } from 'react-icons/hi';

export default function MedicinesPage() {
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [medicines, setMedicines] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    schedule: searchParams.get('schedule') || '',
    stockStatus: searchParams.get('stockStatus') || '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const page = parseInt(searchParams.get('page')) || 1;

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 25);
      if (search) params.set('search', search);
      if (filters.category) params.set('category', filters.category);
      if (filters.schedule) params.set('schedule', filters.schedule);
      if (filters.stockStatus) params.set('stockStatus', filters.stockStatus);

      const { data } = await API.get(`/medicines?${params}`);
      setMedicines(data.data);
      setPagination(data.pagination);
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ search, ...filters, page: 1 });
  };

  const goToPage = (p) => setSearchParams({ search, ...filters, page: p });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Medicines</h1>
          <p className="text-gray-500 text-sm">{pagination.total || 0} products in inventory</p>
        </div>
        <div className="flex gap-2">
          {hasRole('SuperAdmin', 'StoreAdmin', 'Pharmacist') && (
            <Link to="/medicines/new" className="btn-primary flex items-center gap-2">
              <HiOutlinePlus className="w-4 h-4" /> Add Medicine
            </Link>
          )}
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="card mb-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" className="input-field pl-9" placeholder="Search by name, generic, barcode, manufacturer..."
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">Search</button>
          <button type="button" onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2">
            <HiOutlineFilter className="w-4 h-4" /> Filters
          </button>
          <button type="button" onClick={() => { setSearch(''); setFilters({ category: '', schedule: '', stockStatus: '' }); setSearchParams({}); }} className="btn-ghost">
            <HiOutlineRefresh className="w-4 h-4" />
          </button>
        </form>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
            <select className="input-field text-sm" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input-field text-sm" value={filters.schedule} onChange={(e) => setFilters({ ...filters, schedule: e.target.value })}>
              <option value="">All Schedules</option>
              {SCHEDULES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input-field text-sm" value={filters.stockStatus} onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}>
              <option value="">All Stock Status</option>
              <option value="ok">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : medicines.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <HiOutlineCube className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No medicines found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3 hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Schedule</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Rack</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {medicines.map((m) => {
                  const stock = getStockStatus(m.currentStock, m.lowStockThreshold);
                  const sch = getScheduleBadge(m.schedule);
                  return (
                    <tr key={m._id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => window.location.href = `/medicines/${m._id}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{m.medicineName}</p>
                        <p className="text-xs text-gray-400">{m.genericName} {m.manufacturer && `• ${m.manufacturer}`}</p>
                        <p className="text-xs text-gray-300 font-mono">{m.barcode}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell"><span className="badge badge-gray">{m.category}</span></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><span className={`badge ${sch.bg} ${sch.text}`}>{m.schedule}</span></td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{formatCurrency(m.salePrice)}</p>
                        <p className="text-xs text-gray-400">MRP: {formatCurrency(m.mrp)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge badge-${stock.color}`}>{m.currentStock} — {stock.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">{m.rackLocation || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} items)</p>
            <div className="flex gap-1">
              <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="btn-ghost text-xs px-3 py-1 disabled:opacity-30">Prev</button>
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p > pagination.pages || p < 1) return null;
                return (
                  <button key={p} onClick={() => goToPage(p)} className={`px-3 py-1 rounded-lg text-xs font-medium ${p === page ? 'bg-primary-600 text-white' : 'btn-ghost'}`}>{p}</button>
                );
              })}
              <button onClick={() => goToPage(page + 1)} disabled={page >= pagination.pages} className="btn-ghost text-xs px-3 py-1 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
