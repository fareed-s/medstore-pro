import { createContext, useContext, useReducer, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  loading: true,
  isAuthenticated: false,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      if (action.payload.token) localStorage.setItem('token', action.payload.token);
      return { ...state, user: action.payload.user, isAuthenticated: true, loading: false };
    case 'LOAD_USER':
      return { ...state, user: action.payload, isAuthenticated: true, loading: false };
    case 'LOGOUT':
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return { user: null, isAuthenticated: false, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'AUTH_ERROR':
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return { user: null, isAuthenticated: false, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await API.get('/auth/me');
      if (data.success) {
        dispatch({ type: 'LOAD_USER', payload: data.user });
      } else {
        dispatch({ type: 'AUTH_ERROR' });
      }
    } catch {
      dispatch({ type: 'AUTH_ERROR' });
    }
  };

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    if (data.success) {
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: data.user, token: data.token } });
      return data.user;
    }
    throw new Error(data.message);
  };

  const register = async (formData) => {
    const { data } = await API.post('/auth/register', formData);
    if (data.success) {
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: data.user, token: data.token } });
      return data.user;
    }
    throw new Error(data.message);
  };

  const logout = async () => {
    try { await API.post('/auth/logout'); } catch {}
    dispatch({ type: 'LOGOUT' });
  };

  const hasRole = (...roles) => roles.includes(state.user?.role);
  const hasPermission = (perm) => {
    if (!state.user) return false;
    if (['SuperAdmin', 'StoreAdmin'].includes(state.user.role)) return true;
    return state.user.permissions?.[perm] === true;
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, hasRole, hasPermission, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
