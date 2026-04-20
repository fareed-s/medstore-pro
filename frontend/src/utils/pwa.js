// Register Service Worker
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                console.log('[PWA] New content available, refresh to update');
              }
            });
          });
        })
        .catch((err) => console.log('[PWA] SW registration failed:', err));
    });
  }
}

// Check online/offline status
export function useOnlineStatus() {
  const { useState, useEffect } = require('react');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}

// Offline queue for POST/PUT operations
const QUEUE_KEY = 'medstore_offline_queue';

export function addToOfflineQueue(method, url, data) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push({ method, url, data, timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function syncOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (queue.length === 0) return 0;

  let synced = 0;
  const failed = [];

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(item.data),
      });
      if (response.ok) synced++;
      else failed.push(item);
    } catch {
      failed.push(item);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  return synced;
}
