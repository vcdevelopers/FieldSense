import { safeLocalStorage, safeSessionStorage } from '../utils/storage';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - ready for when we integrate authentication
api.interceptors.request.use((config) => {
  const role = safeSessionStorage.getItem('userRole');
  const userId = safeSessionStorage.getItem('userId');
  if (role) config.headers['X-User-Role'] = role;
  if (userId) config.headers['X-User-Id'] = userId;
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;