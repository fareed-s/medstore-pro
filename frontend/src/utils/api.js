import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const API = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token from localStorage for cross-origin
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor
let suspendedNotified = false;
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const path = window.location.pathname;

    // Auth expired / missing → bounce to login
    if (status === 401 && path !== '/login' && path !== '/register') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    // Mid-session suspension or plan expiry → log out with a toast.
    // Coalesce the toast: a single failed render can fire many parallel
    // requests, and we don't want a wall of identical messages.
    if (status === 403 && code === 'STORE_SUSPENDED' && path !== '/login') {
      if (!suspendedNotified) {
        suspendedNotified = true;
        toast.error(error.response?.data?.message || 'Your store has been suspended.');
      }
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    }

    return Promise.reject(error);
  }
);

export default API;
