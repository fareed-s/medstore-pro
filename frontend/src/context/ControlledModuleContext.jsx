// Manages the "module session" for the hidden Controlled/Narcotic Drugs
// area — a SECOND auth layer that lives alongside the main login.
//
// Design choices:
//  • Token stored in sessionStorage (NOT localStorage) — closing the tab
//    instantly locks the module. localStorage would let the next person on
//    the same machine walk in.
//  • 15-minute idle timeout enforced client-side: any pointer/key event
//    resets the timer. Server-side the JWT also expires in 15min.
//  • status() polled on mount and after auth changes so the lock icon's
//    visibility tracks the SuperAdmin's enable/disable + inspection toggle.
//  • All controlled-API requests go through `cApi` here, which auto-attaches
//    `x-controlled-token`. Locked / 401 / 403 from server → forced lock.

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API from '../utils/api';
import { useAuth } from './AuthContext';

const ControlledModuleContext = createContext(null);

const STORAGE_KEY = 'controlled-module-token';
const IDLE_MS = 15 * 60 * 1000;       // 15 min — must match server TTL
const HEARTBEAT_MS = 60 * 1000;       // re-check status every minute

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Dedicated axios for /api/controlled/* — keeps the main API client clean
// and lets us inject the module token without polluting every other request.
const cApi = axios.create({
  baseURL: `${API_BASE}/controlled`,
  withCredentials: true,
});

cApi.interceptors.request.use((config) => {
  // Attach main login token (same as main API client) — server's `protect`
  // middleware needs it for /api/controlled too.
  const main = localStorage.getItem('token');
  if (main) config.headers.Authorization = `Bearer ${main}`;

  // Module token — separate header so it's clearly distinct.
  const mod = sessionStorage.getItem(STORAGE_KEY);
  if (mod) config.headers['x-controlled-token'] = mod;

  return config;
});

export function ControlledModuleProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  // null = unknown / not authenticated yet
  // false = user has no module access (don't render lock icon)
  // true = lock icon should appear (may or may not be unlocked yet)
  const [status, setStatus] = useState(null);
  const [unlocked, setUnlocked] = useState(() => !!sessionStorage.getItem(STORAGE_KEY));

  const idleTimer = useRef(null);
  const heartbeat = useRef(null);

  // ─── Status polling ──────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated || !user || user.role === 'SuperAdmin') {
      setStatus({ enabled: false, inspection: false, canUnlock: false, hasPassword: false });
      return;
    }
    try {
      const { data } = await cApi.get('/auth/status');
      setStatus(data.data);
    } catch {
      setStatus({ enabled: false, inspection: false, canUnlock: false, hasPassword: false });
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchStatus();
    if (heartbeat.current) clearInterval(heartbeat.current);
    heartbeat.current = setInterval(fetchStatus, HEARTBEAT_MS);
    return () => clearInterval(heartbeat.current);
  }, [fetchStatus]);

  // ─── Lock + Idle timeout ─────────────────────────────────────────────────
  const lock = useCallback(async (reason = 'manual') => {
    const had = !!sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (had) {
      // Best-effort — server doesn't block close behaviour on this.
      try { await cApi.post('/auth/lock', { reason }); } catch { /* ignore */ }
    }
  }, []);

  const armIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      lock('idle');
      toast.info('Controlled module locked due to inactivity');
    }, IDLE_MS);
  }, [lock]);

  useEffect(() => {
    if (!unlocked) return;
    armIdleTimer();
    const onActivity = () => armIdleTimer();
    const events = ['mousedown', 'keydown', 'pointermove', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    // Also lock on tab close.
    const onClose = () => {
      // Use sendBeacon for the lock log — survives unload.
      try {
        const url = `${API_BASE}/controlled/auth/lock`;
        const body = new Blob([JSON.stringify({ reason: 'tab-close' })], { type: 'application/json' });
        navigator.sendBeacon?.(url, body);
      } catch { /* ignore */ }
      sessionStorage.removeItem(STORAGE_KEY);
    };
    window.addEventListener('beforeunload', onClose);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener('beforeunload', onClose);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [unlocked, armIdleTimer]);

  // ─── Unlock ──────────────────────────────────────────────────────────────
  const unlock = useCallback(async (password) => {
    const { data } = await cApi.post('/auth/unlock', { password });
    sessionStorage.setItem(STORAGE_KEY, data.token);
    setUnlocked(true);
    armIdleTimer();
    return data;
  }, [armIdleTimer]);

  // ─── Force lock when main user logs out ──────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) lock('logout');
  }, [isAuthenticated, lock]);

  // ─── Auto-lock on 401/403 from any controlled API call ───────────────────
  useEffect(() => {
    const id = cApi.interceptors.response.use(
      (r) => r,
      (err) => {
        const code = err.response?.data?.code;
        if (err.response?.status === 401 ||
            code === 'MODULE_LOCKED' ||
            code === 'MODULE_DISABLED' ||
            code === 'MODULE_INSPECTION') {
          sessionStorage.removeItem(STORAGE_KEY);
          setUnlocked(false);
          fetchStatus();
        }
        return Promise.reject(err);
      }
    );
    return () => cApi.interceptors.response.eject(id);
  }, [fetchStatus]);

  const value = {
    status,
    unlocked,
    unlock,
    lock,
    refreshStatus: fetchStatus,
    cApi,
    // Convenience flag — the lock icon should only render when:
    //  • module is enabled for the store
    //  • not in inspection mode
    //  • this user has unlock rights
    showLockIcon: !!(status?.enabled && !status?.inspection && status?.canUnlock),
  };

  return (
    <ControlledModuleContext.Provider value={value}>
      {children}
    </ControlledModuleContext.Provider>
  );
}

export function useControlledModule() {
  const ctx = useContext(ControlledModuleContext);
  if (!ctx) throw new Error('useControlledModule must be used inside ControlledModuleProvider');
  return ctx;
}

// Exported so non-hook code (e.g. SuperAdmin pages) can call the controlled
// API. The interceptor still attaches main + module tokens automatically.
export { cApi as controlledApi };
