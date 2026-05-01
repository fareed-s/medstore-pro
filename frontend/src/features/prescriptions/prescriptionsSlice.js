import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import * as api from './prescriptionsService';

const wrap = (fn) => async (arg, { rejectWithValue }) => {
  try { return await fn(arg); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
};

export const fetchPrescriptions      = createAsyncThunk('rx/fetch',  wrap((p) => api.listPrescriptions(p || {})));
export const createPrescriptionThunk = createAsyncThunk('rx/create', wrap((p) => api.createPrescription(p)));

const initialState = {
  list: [], status: 'idle',
  filters: { status: '' },
};

const slice = createSlice({
  name: 'prescriptions',
  initialState,
  reducers: { setFilter(s, a) { s.filters = { ...s.filters, ...a.payload }; } },
  extraReducers: (b) => {
    b.addCase(fetchPrescriptions.pending,   (s) => { s.status = 'loading'; });
    b.addCase(fetchPrescriptions.fulfilled, (s, a) => { s.status = 'succeeded'; s.list = a.payload || []; });
    b.addCase(fetchPrescriptions.rejected,  (s) => { s.status = 'failed'; });
    b.addCase(createPrescriptionThunk.fulfilled, (s, a) => { s.list.unshift(a.payload); });
  },
});

export const { setFilter } = slice.actions;
export default slice.reducer;

export const selectPrescriptionsList    = (s) => s.prescriptions.list;
export const selectPrescriptionsStatus  = (s) => s.prescriptions.status;
export const selectPrescriptionsFilters = (s) => s.prescriptions.filters;

export const selectPrescriptionIds = createSelector([selectPrescriptionsList], (l) => l.map((x) => x._id));
export const makeSelectPrescriptionById = (id) => (state) => state.prescriptions.list.find((x) => x._id === id);
