import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import * as salesApi from './salesService';

export const fetchSales        = createAsyncThunk('sales/fetch',   async (p, { rejectWithValue }) => {
  try { return await salesApi.listSales(p || {}); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const fetchTodaySummary = createAsyncThunk('sales/summary', async (_, { rejectWithValue }) => {
  try { return await salesApi.getTodaySummary(); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});
export const voidSaleThunk     = createAsyncThunk('sales/void',    async ({ id, reason }, { rejectWithValue }) => {
  try { return await salesApi.voidSale(id, reason); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

const initialState = {
  list: [],
  pagination: { page: 1, pages: 0, total: 0 },
  status: 'idle',
  summary: null,
  filters: { search: '', status: '', dateFrom: '', dateTo: '', page: 1 },
};

const slice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    setFilter(s, a) { s.filters = { ...s.filters, ...a.payload }; },
    setPage(s, a)   { s.filters.page = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchSales.pending,   (s) => { s.status = 'loading'; });
    b.addCase(fetchSales.fulfilled, (s, a) => { s.status = 'succeeded'; s.list = a.payload.list || []; s.pagination = a.payload.pagination || initialState.pagination; });
    b.addCase(fetchSales.rejected,  (s) => { s.status = 'failed'; });
    b.addCase(fetchTodaySummary.fulfilled, (s, a) => { s.summary = a.payload; });
    b.addCase(voidSaleThunk.fulfilled, (s, a) => {
      const i = s.list.findIndex((x) => x._id === a.payload._id);
      if (i >= 0) s.list[i] = a.payload;
    });
  },
});

export const { setFilter, setPage } = slice.actions;
export default slice.reducer;

export const selectSalesList    = (s) => s.sales.list;
export const selectSalesStatus  = (s) => s.sales.status;
export const selectSalesPaging  = (s) => s.sales.pagination;
export const selectSalesFilters = (s) => s.sales.filters;
export const selectSalesSummary = (s) => s.sales.summary;

export const selectSaleIds = createSelector([selectSalesList], (list) => list.map((x) => x._id));
export const makeSelectSaleById = (id) => (state) => state.sales.list.find((x) => x._id === id);
