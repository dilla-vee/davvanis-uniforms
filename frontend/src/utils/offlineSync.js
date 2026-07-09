import { getApiBaseUrl } from './api';

const QUEUE_KEY = 'unistore_offline_queue';
const FAILED_QUEUE_KEY = 'unistore_failed_queue';
const CACHE_KEY_PREFIX = 'unistore_cache_';

// Add an action to the offline queue
export const addToOfflineQueue = (path, options) => {
  const queue = getOfflineQueue();
  queue.push({
    id: Date.now().toString(),
    path,
    options,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event('offline-queue-updated'));
};

// Get the current queue
export const getOfflineQueue = () => {
  const q = localStorage.getItem(QUEUE_KEY);
  return q ? JSON.parse(q) : [];
};

export const getFailedQueue = () => {
  const q = localStorage.getItem(FAILED_QUEUE_KEY);
  return q ? JSON.parse(q) : [];
};

// Remove item from queue
export const removeFromOfflineQueue = (id) => {
  let queue = getOfflineQueue();
  queue = queue.filter(item => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event('offline-queue-updated'));
};

const moveToFailedQueue = (item, errorMsg) => {
  removeFromOfflineQueue(item.id);
  const failed = getFailedQueue();
  failed.push({ ...item, error: errorMsg });
  localStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(failed));
  window.dispatchEvent(new Event('offline-queue-updated'));
};

// Process the queue
let isSyncing = false;
export const processOfflineQueue = async () => {
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;

  try {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    const baseUrl = getApiBaseUrl();

    for (const item of queue) {
      if (!navigator.onLine) break;

      try {
        const url = item.path.startsWith('http') ? item.path : `${baseUrl}${item.path}`;
        const token = localStorage.getItem('unistore_token');
        const headers = { ...item.options.headers };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { ...item.options, headers });
        
        if (response.ok) {
          // Successfully synced
          removeFromOfflineQueue(item.id);
        } else {
          // If unauthenticated, stop syncing and wait for login
          if (response.status === 401 || response.status === 403) {
            break;
          }
          // If 4xx client error (e.g. invalid data, out of stock), it will never succeed.
          // Move to failed queue so it doesn't block the rest of the queue.
          if (response.status >= 400 && response.status < 500) {
            const data = await response.json().catch(() => ({}));
            moveToFailedQueue(item, data.error || `Client error ${response.status}`);
          }
          // If 5xx server error, keep it in the queue to retry later
        }
      } catch (e) {
        // Network error (e.g. server down, lost connection during loop), stop processing
        console.error('Network error during sync:', e);
        break;
      }
    }
  } finally {
    isSyncing = false;
  }
};

// Setup background listener
export const initOfflineSync = () => {
  window.addEventListener('online', () => {
    processOfflineQueue();
  });
  // Periodic retry check every 30 seconds if online
  setInterval(() => {
    if (navigator.onLine) processOfflineQueue();
  }, 30000);
};

// Caching for GET requests
export const saveToCache = (path, data) => {
  try {
    // Strip query parameters for basic cache key
    const keyPath = path.split('?')[0];
    localStorage.setItem(`${CACHE_KEY_PREFIX}${keyPath}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache:', e);
  }
};

export const getFromCache = (path) => {
  const keyPath = path.split('?')[0];
  const data = localStorage.getItem(`${CACHE_KEY_PREFIX}${keyPath}`);
  return data ? JSON.parse(data) : null;
};
