import { Capacitor } from '@capacitor/core';

export const getApiBaseUrl = () => {
  const isCapacitorNative = Capacitor.isNativePlatform();
  const isWebView = window.location.hostname === 'localhost' && window.location.port === '';
  if (isCapacitorNative || isWebView) {
    return 'https://davvanis-uniforms-production.up.railway.app';
  }
  return '';
};

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
  
  return response;
};

// Helper to resolve Image paths (/uploads/...)
export const resolveImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${path}`;
};
