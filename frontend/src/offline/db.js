// Local IndexedDB layer for offline support.
//
// Single-cashier-offline rule: we explicitly do NOT try to handle two
// cashiers selling concurrently while offline (that's a stock-conflict
// nightmare). The store is responsible for ensuring only one device is in
// offline mode at a time.
//
// Tables:
//   medicines    — read-through cache of the catalog (full doc per row)
//   customers    — read-through cache of customer list
//   categories   — read-through cache (lightweight)
//   pendingSales — sales created while offline, awaiting sync
//   meta         — k/v table: lastMedicineSync, lastCustomerSync, etc.

import Dexie from 'dexie';

const DB_NAME = 'medstore-offline';

export const db = new Dexie(DB_NAME);

db.version(1).stores({
  // `_id` is the Mongo ObjectId. medicineName + barcode for fast search.
  medicines:    '_id, medicineName, barcode, currentStock, isActive, storeId',
  customers:    '_id, name, phone, storeId',
  categories:   '_id, name, storeId',

  // Each row is a Sale we couldn't POST yet.
  //   tempId       — uuid we generate so React can key it before server returns real _id
  //   status       — 'pending' | 'syncing' | 'synced' | 'failed'
  //   payload      — the JSON body that would have been POSTed to /api/sales
  //   createdAt    — when the cashier completed it offline (numeric ms)
  //   syncedAt     — when it finally hit the server
  //   serverInvoiceNo — populated after success (for UX continuity)
  //   error        — last sync error message (if status==='failed')
  //   attempts     — retry counter
  pendingSales: 'tempId, status, createdAt, storeId',

  meta: 'key',
});

// ── Helpers ────────────────────────────────────────────────────────────────

// Replace the entire cache for a tenant. Wipes the table first so deleted
// catalog entries don't ghost around. We keep this scoped to the user's
// storeId so future multi-store devices don't leak.
export const replaceMedicinesCache = async (storeId, list) => {
  await db.transaction('rw', db.medicines, db.meta, async () => {
    await db.medicines.where('storeId').equals(storeId).delete();
    if (list.length) {
      await db.medicines.bulkPut(list.map((m) => ({ ...m, storeId })));
    }
    await db.meta.put({ key: `lastMedicineSync:${storeId}`, value: Date.now() });
  });
};

export const replaceCustomersCache = async (storeId, list) => {
  await db.transaction('rw', db.customers, db.meta, async () => {
    await db.customers.where('storeId').equals(storeId).delete();
    if (list.length) {
      await db.customers.bulkPut(list.map((c) => ({ ...c, storeId })));
    }
    await db.meta.put({ key: `lastCustomerSync:${storeId}`, value: Date.now() });
  });
};

export const replaceCategoriesCache = async (storeId, list) => {
  await db.transaction('rw', db.categories, db.meta, async () => {
    await db.categories.where('storeId').equals(storeId).delete();
    if (list.length) {
      await db.categories.bulkPut(list.map((c) => ({ ...c, storeId })));
    }
    await db.meta.put({ key: `lastCategorySync:${storeId}`, value: Date.now() });
  });
};

export const getCachedMedicines = (storeId) =>
  db.medicines.where('storeId').equals(storeId).toArray();

export const getCachedCustomers = (storeId) =>
  db.customers.where('storeId').equals(storeId).toArray();

export const getMeta = async (key) => (await db.meta.get(key))?.value ?? null;

// Locally adjust a medicine's currentStock (and matching batch.remainingQty)
// after a sale is queued offline, so the cashier sees a sensible figure on
// their next search. This is best-effort — the server is still source of
// truth, and on reconnect we re-pull the catalog.
export const decrementCachedStock = async (storeId, lines) => {
  await db.transaction('rw', db.medicines, async () => {
    for (const line of lines) {
      const med = await db.medicines.get(line.medicineId);
      if (!med) continue;
      med.currentStock = Math.max(0, (med.currentStock || 0) - line.quantity);
      // If we know which batch was sold, drop it from the batch list too so
      // the FIFO picker shows accurate remaining counts.
      if (line.batchId && Array.isArray(med.batches)) {
        med.batches = med.batches.map((b) =>
          String(b._id) === String(line.batchId)
            ? { ...b, remainingQty: Math.max(0, (b.remainingQty || 0) - line.quantity) }
            : b
        );
      }
      await db.medicines.put(med);
    }
  });
};

// ── Pending sales queue ────────────────────────────────────────────────────

export const enqueueSale = (sale) => db.pendingSales.put(sale);

export const listPendingSales = (storeId) =>
  db.pendingSales.where('storeId').equals(storeId).reverse().sortBy('createdAt');

export const countPending = async (storeId) => {
  const all = await db.pendingSales.where('storeId').equals(storeId).toArray();
  return all.filter((s) => s.status === 'pending' || s.status === 'failed').length;
};

export const updatePending = (tempId, patch) =>
  db.pendingSales.update(tempId, patch);

export const deletePending = (tempId) => db.pendingSales.delete(tempId);
