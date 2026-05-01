import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import * as api from './expensesService';

const wrap = (fn) => async (arg, { rejectWithValue }) => {
  try { return await fn(arg); } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
};

export const fetchExpenses        = createAsyncThunk('expenses/fetch',   wrap(api.listExpenses));
export const fetchExpensesSummary = createAsyncThunk('expenses/summary', wrap(api.getExpensesSummary));
export const createExpenseThunk   = createAsyncThunk('expenses/create',  wrap((p) => api.createExpense(p)));
export const deleteExpenseThunk   = createAsyncThunk('expenses/delete',
  async (id, { rejectWithValue }) => {
    try { await api.deleteExpense(id); return id; } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

const initialState = { list: [], summary: null, status: 'idle' };

const slice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchExpenses.pending,   (s) => { s.status = 'loading'; });
    b.addCase(fetchExpenses.fulfilled, (s, a) => { s.status = 'succeeded'; s.list = a.payload || []; });
    b.addCase(fetchExpenses.rejected,  (s) => { s.status = 'failed'; });
    b.addCase(fetchExpensesSummary.fulfilled, (s, a) => { s.summary = a.payload; });
    b.addCase(createExpenseThunk.fulfilled, (s, a) => { s.list.unshift(a.payload); });
    b.addCase(deleteExpenseThunk.fulfilled, (s, a) => { s.list = s.list.filter((x) => x._id !== a.payload); });
  },
});

export default slice.reducer;

export const selectExpensesList    = (s) => s.expenses.list;
export const selectExpensesStatus  = (s) => s.expenses.status;
export const selectExpensesSummary = (s) => s.expenses.summary;
export const selectExpenseIds      = createSelector([selectExpensesList], (l) => l.map((e) => e._id));
export const makeSelectExpenseById = (id) => (s) => s.expenses.list.find((e) => e._id === id);
