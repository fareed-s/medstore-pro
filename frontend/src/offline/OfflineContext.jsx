// Network-status + offline-sync context.
//
// Responsibilities:
//   1. Track whether we have a working backend connection (not just
//      `navigator.onLine`, which lies — WiFi up ≠ API reachable).
//   2. On reconnect, drain the pending-sales queue.
//   3. Periodically refresh the medicine + customer cache while online so
//      the data the cashier sees offline is reasonably fresh.
//   4. Expose helpers (refreshNow, syncNow, pendingCount) for the rest of
//      the app to use.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  countPending, deletePending, enqueueSale, listPendingSales, updatePending,
  replaceMedicinesCache, replaceCustomersCache,
} from './db';

const HEARTBEAT_MS = 30 * 1000;       // probe API every 30s
const REFRESH_MS = 5 * 60 * 1000;     // refresh catalog cache every 5 min when online
const SYNC_RETRY_LIMIT = 3;

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const storeId = user?.storeId;

  const [online, setOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Refs because intervals/listeners shouldn't tear down on every re-render.
  const heartbeat = useRef(null);
  const refresher = useRef(null);

  // Quick API probe — `/api/health` is cheap and unauthenticated. We treat
  // any 2xx as "API reachable", anything else as offline.
  const probeApi = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  // ── Pending count refresh ──────────────────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    if (!storeId) return setPendingCount(0);
    try { setPendingCount(await countPending(storeId)); }
    catch { /* IDB error — ignore */ }
  }, [storeId]);

  // ── Sync the queue (drain pending sales) ───────────────────────────────
  const drainQueue = useCallback(async () => {
    if (!storeId || syncing) return;
    setSyncing(true);
    try {
      const queue = await listPendingSales(storeId);
      let synced = 0, failed = 0;
      for (const sale of queue) {
        if (sale.status === 'synced') continue;
        if ((sale.attempts || 0) >= SYNC_RETRY_LIMIT && sale.status === 'failed') continue;

        await updatePending(sale.tempId, { status: 'syncing' });
        try {
          // POST exactly the body the cashier built. Server returns the real
          // sale (with invoice number, server _id, server timestamp).
          const res = await API.post('/sales', sale.payload);
          await updatePending(sale.tempId, {
            status: 'synced',
            syncedAt: Date.now(),
            serverInvoiceNo: res.data?.data?.invoiceNo || res.data?.invoiceNo || null,
            error: null,
          });
          synced++;
        } catch (err) {
          // Mark failed but keep the row — admin can review + retry/abandon.
          await updatePending(sale.tempId, {
            status: 'failed',
            attempts: (sale.attempts || 0) + 1,
            error: err.response?.data?.message || err.message || 'Sync failed',
          });
          failed++;
        }
      }
      if (synced > 0) toast.success(`Synced ${synced} offline sale(s)`);
      if (failed > 0) toast.error(`${failed} sale(s) failed to sync — review in Settings → Offline Sync`);
    } finally {
      setSyncing(false);
      await refreshPendingCount();
    }
  }, [storeId, syncing, refreshPendingCount]);

  // ── Catalog refresh (medicines + customers) ────────────────────────────
  const refreshCatalog = useCallback(async () => {
    if (!storeId) return;
    try {
      // Pull EVERYTHING the POS might need offline. Limit is generous;
      // pharmacies typically have 5-30k medicines tops.
      const [medRes, custRes] = await Promise.all([
        API.get('/medicines?limit=50000'),
        API.get('/customers?limit=10000').catch(() => ({ data: { data: [] } })),
      ]);
      const meds = medRes.data?.data || [];
      const custs = custRes.data?.data || [];
      await replaceMedicinesCache(storeId, meds);
      await replaceCustomersCache(storeId, custs);
      setLastRefresh(Date.now());
    } catch {
      // Non-fatal — we'll try again on the next interval / reconnect.
    }
  }, [storeId]);

  // ── Heartbeat: detect online/offline via real API probe ────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const tick = async () => {
      const wasOnline = online;
      const reachable = await probeApi();
      setOnline(reachable);
      // Just came back online → drain queue + refresh catalog.
      if (!wasOnline && reachable) {
        toast.info('Back online — syncing…');
        drainQueue();
        refreshCatalog();
      }
    };
    tick();   // immediate
    heartbeat.current = setInterval(tick, HEARTBEAT_MS);

    // Browser-level events for instant reaction (still cross-checked by tick).
    const onOnline  = () => tick();
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      clearInterval(heartbeat.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [isAuthenticated, probeApi, drainQueue, refreshCatalog, online]);

  // ── Periodic catalog refresh while online ──────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !online || !storeId) return;
    refreshCatalog();
    refresher.current = setInterval(refreshCatalog, REFRESH_MS);
    return () => clearInterval(refresher.current);
  }, [isAuthenticated, online, storeId, refreshCatalog]);

  // ── Track pending count ────────────────────────────────────────────────
  useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

  // ── Public helper: queue a sale (called from POS when offline) ─────────
  const queueSaleOffline = useCallback(async (payload) => {
    if (!storeId) throw new Error('No store context');
    const tempId = `OFFLINE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const sale = {
      tempId,
      storeId,
      status: 'pending',
      payload,
      createdAt: Date.now(),
      attempts: 0,
    };
    await enqueueSale(sale);
    await refreshPendingCount();
    return tempId;
  }, [storeId, refreshPendingCount]);

  const removePending = useCallback(async (tempId) => {
    await deletePending(tempId);
    await refreshPendingCount();
  }, [refreshPendingCount]);

  const value = {
    online,
    syncing,
    pendingCount,
    lastRefresh,
    queueSaleOffline,
    removePending,
    syncNow: drainQueue,
    refreshNow: refreshCatalog,
    refreshPendingCount,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used inside OfflineProvider');
  return ctx;
}
