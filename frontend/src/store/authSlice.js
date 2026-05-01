import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../utils/api';

const persistedUser = (() => {
  try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
})();

const persistUser = (user) => {
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
};
const persistToken = (token) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};

// ─── Async thunks ───────────────────────────────────────────────────────────

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await API.post('/auth/login', { email, password });
      if (!data.success) return rejectWithValue(data.message || 'Login failed');
      return { user: data.user, token: data.token };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Login failed');
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await API.post('/auth/register', formData);
      if (!data.success) return rejectWithValue(data.message || 'Registration failed');
      return { user: data.user, token: data.token };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Registration failed');
    }
  }
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try { await API.post('/auth/logout'); } catch { /* server-side logout is best-effort */ }
});

export const fetchMeThunk = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get('/auth/me');
      if (!data.success) return rejectWithValue('Not authenticated');
      return data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Not authenticated');
    }
  }
);

// ─── Slice ──────────────────────────────────────────────────────────────────

const initialState = {
  user: persistedUser,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuth(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      persistUser(null);
      persistToken(null);
    },
  },
  extraReducers: (builder) => {
    const setAuthed = (state, action) => {
      const payload = action.payload || {};
      const user = payload.user || payload;
      state.user = user;
      state.isAuthenticated = !!user;
      state.loading = false;
      state.error = null;
      persistUser(user);
      if (payload.token) persistToken(payload.token);
    };
    const clearAuthed = (state, action) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = action?.payload || null;
      persistUser(null);
      persistToken(null);
    };

    builder
      // login
      .addCase(loginThunk.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(loginThunk.fulfilled, setAuthed)
      .addCase(loginThunk.rejected,  clearAuthed)
      // register
      .addCase(registerThunk.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(registerThunk.fulfilled, setAuthed)
      .addCase(registerThunk.rejected,  clearAuthed)
      // me (called on app boot)
      .addCase(fetchMeThunk.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchMeThunk.fulfilled, setAuthed)
      .addCase(fetchMeThunk.rejected,  clearAuthed)
      // logout
      .addCase(logoutThunk.fulfilled, (s) => {
        s.user = null; s.isAuthenticated = false; s.loading = false; s.error = null;
        persistUser(null); persistToken(null);
      });
  },
});

export const { clearAuth } = authSlice.actions;
export default authSlice.reducer;

// ─── Selectors & permission helpers (used by the useAuth hook) ──────────────

export const selectAuthUser    = (state) => state.auth.user;
export const selectIsAuthed    = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;

export const userHasRole = (user, roles) => roles.includes(user?.role);

export const userHasFlagPermission = (user, perm) => {
  if (!user) return false;
  if (['SuperAdmin', 'StoreAdmin'].includes(user.role)) return true;
  return user.permissions?.[perm] === true;
};

export const userCan = (user, moduleKey, action = 'view') => {
  if (!user) return false;
  if (['SuperAdmin', 'StoreAdmin'].includes(user.role)) return true;
  return !!user.modulePermissions?.[moduleKey]?.[action];
};
