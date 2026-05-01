import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import * as customersApi from './customersService';

// ─── Thunks ─────────────────────────────────────────────────────────────────

export const fetchCustomers = createAsyncThunk(
  'customers/fetch',
  async (filters, { rejectWithValue }) => {
    try { return await customersApi.listCustomers(filters || {}); }
    catch (err) { return rejectWithValue(err.response?.data?.message || err.message); }
  }
);

export const createCustomerThunk = createAsyncThunk(
  'customers/create',
  async (payload, { rejectWithValue }) => {
    try { return await customersApi.createCustomer(payload); }
    catch (err) { return rejectWithValue(err.response?.data?.message || err.message); }
  }
);

export const updateCustomerThunk = createAsyncThunk(
  'customers/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try { return await customersApi.updateCustomer(id, payload); }
    catch (err) { return rejectWithValue(err.response?.data?.message || err.message); }
  }
);

// ─── Slice ──────────────────────────────────────────────────────────────────

const initialState = {
  list: [],
  status: 'idle',          // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  filters: { search: '', type: '' },
};

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setFilter(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchCustomers.pending,   (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(fetchCustomers.fulfilled, (s, a) => { s.status = 'succeeded'; s.list = a.payload || []; });
    b.addCase(fetchCustomers.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; });

    b.addCase(createCustomerThunk.fulfilled, (s, a) => { s.list.unshift(a.payload); });
    b.addCase(updateCustomerThunk.fulfilled, (s, a) => {
      const i = s.list.findIndex((c) => c._id === a.payload._id);
      if (i >= 0) s.list[i] = a.payload;
    });
  },
});

export const { setFilter, resetFilters } = customersSlice.actions;
export default customersSlice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────
// Rules:
//  - Return primitives or stable references
//  - Use createSelector for derived data
//  - Components subscribe to the smallest slice they need

export const selectCustomersList    = (s) => s.customers.list;
export const selectCustomersStatus  = (s) => s.customers.status;
export const selectCustomersFilters = (s) => s.customers.filters;
export const selectCustomersError   = (s) => s.customers.error;
export const selectCustomersCount   = (s) => s.customers.list.length;

// Stable list of IDs — combined with shallowEqual in useSelector, the table
// only re-renders when the set of customers actually changes.
export const selectCustomerIds = createSelector(
  [selectCustomersList],
  (list) => list.map((c) => c._id)
);

// Per-row selector — each <CustomerRow/> subscribes only to its own customer,
// so updating one row never re-renders the others.
export const makeSelectCustomerById = (id) => (state) =>
  state.customers.list.find((c) => c._id === id);
