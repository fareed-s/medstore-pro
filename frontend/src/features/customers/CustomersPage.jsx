// Container component — owns local UI state (form open / edit target) and
// orchestrates Redux. No JSX details, no API calls, no derived data.
// Each child below is memoized and subscribes only to the slice it needs.

import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import {
  fetchCustomers,
  selectCustomersFilters,
  selectCustomersCount,
} from './customersSlice';
import CustomerHeader from './components/CustomerHeader';
import CustomerFilters from './components/CustomerFilters';
import CustomerForm from './components/CustomerForm';
import CustomerTable from './components/CustomerTable';

export default function CustomersPage() {
  const dispatch = useDispatch();
  const count = useSelector(selectCustomersCount);
  const filters = useSelector(selectCustomersFilters, shallowEqual);

  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);

  // Auto-fetch on mount and whenever the type filter changes.
  // Search is button/Enter-driven (matches existing UX), so we don't depend on it here.
  useEffect(() => {
    dispatch(fetchCustomers({ search: filters.search, type: filters.type }));
  }, [dispatch, filters.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(() => {
    dispatch(fetchCustomers({ search: filters.search, type: filters.type }));
  }, [dispatch, filters.search, filters.type]);

  const openCreate = useCallback(() => { setEditId(null); setShowForm(true); }, []);
  const openEdit   = useCallback((id) => { setEditId(id); setShowForm(true); }, []);
  const closeForm  = useCallback(() => { setShowForm(false); setEditId(null); }, []);

  return (
    <div>
      <CustomerHeader count={count} onAdd={openCreate} />
      <CustomerFilters onSearch={handleSearch} />
      {showForm && <CustomerForm editId={editId} onClose={closeForm} />}
      <CustomerTable onEdit={openEdit} />
    </div>
  );
}
