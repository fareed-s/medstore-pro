// Backwards-compatible auth surface. The actual state lives in Redux
// (see ../store/authSlice.js); this module preserves the existing
// `useAuth()` and `AuthProvider` exports so existing pages don't need to change.

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  loginThunk, registerThunk, logoutThunk, fetchMeThunk,
  selectAuthUser, selectIsAuthed, selectAuthLoading,
  userCan, userHasRole, userHasFlagPermission,
} from '../store/authSlice';

// AuthProvider is now a no-op wrapper kept only so existing imports keep
// working. The Redux <Provider> in main.jsx is what actually supplies state.
export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);

  // Hydrate the user from /auth/me once on app boot.
  useEffect(() => {
    dispatch(fetchMeThunk());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Touch `user` to silence linter when it's only used by selectors below.
  void user;

  return children;
}

export function useAuth() {
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const isAuthenticated = useSelector(selectIsAuthed);
  const loading = useSelector(selectAuthLoading);

  return {
    user,
    isAuthenticated,
    loading,

    login: async (email, password) => {
      const res = await dispatch(loginThunk({ email, password }));
      if (res.error) throw new Error(res.payload || res.error.message || 'Login failed');
      return res.payload.user;
    },

    register: async (formData) => {
      const res = await dispatch(registerThunk(formData));
      if (res.error) throw new Error(res.payload || res.error.message || 'Registration failed');
      return res.payload.user;
    },

    logout: async () => { await dispatch(logoutThunk()); },

    checkAuth: async () => { await dispatch(fetchMeThunk()); },

    hasRole: (...roles) => userHasRole(user, roles),
    hasPermission: (perm) => userHasFlagPermission(user, perm),
    can: (moduleKey, action = 'view') => userCan(user, moduleKey, action),
  };
}
