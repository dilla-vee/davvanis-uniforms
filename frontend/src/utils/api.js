import { Capacitor } from '@capacitor/core';

export const getApiBaseUrl = () => {
  const isCapacitorNative = Capacitor.isNativePlatform();
  const isWebView = window.location.hostname === 'localhost' && window.location.port === '';
  if (isCapacitorNative || isWebView) {
    return 'https://davvanis-uniforms-production.up.railway.app';
  }
  return '';
};

import { addToOfflineQueue, saveToCache, getFromCache } from './offlineSync';

// Helper to resolve API paths
export const apiFetch = async (path, options = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  
  // Inject JWT token if session exists
  const token = localStorage.getItem('unistore_token');
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }

  const isGet = !options.method || options.method === 'GET';

  try {
    if (!navigator.onLine) {
      throw new Error('Offline');
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      let errMsg = `Request failed with status ${response.status}`;
      try {
        const data = await response.json();
        if (data && data.error) {
          errMsg = data.error;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('unistore_token');
        localStorage.removeItem('unistore_user');
        window.dispatchEvent(new Event('auth-logout'));
      }
      
      throw new Error(errMsg);
    }
    
    // If it's a GET, cache the response
    if (isGet) {
      const clone = response.clone();
      const data = await clone.json();
      saveToCache(path, data);
    }
    
    return response;
  } catch (err) {
    // If network failure or explicitly offline
    if (err.message === 'Offline' || err.message === 'Failed to fetch' || err.name === 'TypeError') {
      if (isGet) {
        const cachedData = getFromCache(path);
        if (cachedData) {
          // Return cached data as a fake Response
          return new Response(JSON.stringify(cachedData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw new Error('You are offline and no cached data is available.');
      } else {
        // It's a POST/PUT/DELETE, add to queue
        addToOfflineQueue(path, options);
        // Mock a success response so the UI continues
        return new Response(JSON.stringify({ success: true, offline: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    throw err;
  }
};

// Helper to resolve Image paths (/uploads/...)
export const resolveImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${path}`;
};
