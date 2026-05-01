import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import * as api from './suppliersService';

const wrap = (fn) => async (arg, { rejectWithValue }) => {
  try { return await fn(arg); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
};

export const fetchSuppliers       = createAsyncThunk('suppliers/fetch',  wrap((p) => api.listSuppliers(p || {})));
export const createSupplierThunk  = createAsyncThunk('suppliers/create', wrap((p) => api.createSupplier(p)));
export const updateSupplierThunk  = createAsyncThunk('suppliers/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try { return await api.updateSupplier(id, payload); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

const initialState = {
  list: [],
  status: 'idle',
  filters: { search: '' },
};

const slice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: { setFilter(s, a) { s.filters = { ...s.filters, ...a.payload }; } },
  extraReducers: (b) => {
    b.addCase(fetchSuppliers.pending,   (s) => { s.status = 'loading'; });
    b.addCase(fetchSuppliers.fulfilled, (s, a) => { s.status = 'succeeded'; s.list = a.payload || []; });
    b.addCase(fetchSuppliers.rejected,  (s) => { s.status = 'failed'; });
    b.addCase(createSupplierThunk.fulfilled, (s, a) => { s.list.unshift(a.payload); });
    b.addCase(updateSupplierThunk.fulfilled, (s, a) => {
      const i = s.list.findIndex((x) => x._id === a.payload._id);
      if (i >= 0) s.list[i] = a.payload;
    });
  },
});

export const { setFilter } = slice.actions;
export default slice.reducer;

export const selectSuppliersList    = (s) => s.suppliers.list;
export const selectSuppliersStatus  = (s) => s.suppliers.status;
export const selectSuppliersFilters = (s) => s.suppliers.filters;
export const selectSuppliersCount   = (s) => s.suppliers.list.length;

export const selectSupplierIds = createSelector([selectSuppliersList], (l) => l.map((x) => x._id));
export const makeSelectSupplierById = (id) => (state) => state.suppliers.list.find((x) => x._id === id);
