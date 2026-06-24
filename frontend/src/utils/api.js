import { Capacitor } from '@capacitor/core';

// Base URL points to the production server if on native mobile, otherwise relative
export const API_BASE_URL = Capacitor.isNativePlatform()
  ? 'https://davvanis-uniforms-production.up.railway.app'
  : '';

// Helper to resolve API paths
export const apiFetch = (path, options = {}) => {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  return fetch(url, options);
};

// Helper to resolve Image paths (/uploads/...)
export const resolveImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};
