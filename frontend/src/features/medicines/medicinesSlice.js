import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import * as medicinesApi from './medicinesService';

export const fetchMedicines = createAsyncThunk(
  'medicines/fetch',
  async (params, { rejectWithValue }) => {
    try { return await medicinesApi.listMedicines(params || {}); }
    catch (err) { return rejectWithValue(err.response?.data?.message || err.message); }
  }
);

const initialState = {
  list: [],
  pagination: { page: 1, pages: 0, total: 0 },
  status: 'idle',
  error: null,
  filters: { search: '', category: '', schedule: '', stockStatus: '', page: 1 },
};

const medicinesSlice = createSlice({
  name: 'medicines',
  initialState,
  reducers: {
    setFilter(state, action)  { state.filters = { ...state.filters, ...action.payload }; },
    resetFilters(state)       { state.filters = initialState.filters; },
    setPage(state, action)    { state.filters.page = action.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchMedicines.pending,   (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(fetchMedicines.fulfilled, (s, a) => {
      s.status = 'succeeded';
      s.list = a.payload.list || [];
      s.pagination = a.payload.pagination || initialState.pagination;
    });
    b.addCase(fetchMedicines.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; });
  },
});

export const { setFilter, resetFilters, setPage } = medicinesSlice.actions;
export default medicinesSlice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectMedicinesList    = (s) => s.medicines.list;
export const selectMedicinesStatus  = (s) => s.medicines.status;
export const selectMedicinesFilters = (s) => s.medicines.filters;
export const selectMedicinesPaging  = (s) => s.medicines.pagination;

export const selectMedicineIds = createSelector(
  [selectMedicinesList],
  (list) => list.map((m) => m._id)
);

export const makeSelectMedicineById = (id) => (state) =>
  state.medicines.list.find((m) => m._id === id);
