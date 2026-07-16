import { safeSessionStorage } from '../utils/storage';
import { API_BASE_URL } from '@/config';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'X-User-Role': safeSessionStorage.getItem('userRole') || '',
    'X-User-Id': safeSessionStorage.getItem('userId') || '',
  };
};

export const apiClient = {
  get: async <T = any>(endpoint: string): Promise<T | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: getHeaders()
      });
      if (!response.ok) {
        throw new Error(`API error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}`, error);
      return null;
    }
  },

  post: async <T = any>(endpoint: string, data: any): Promise<T | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`API error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to POST to ${endpoint}`, error);
      return null;
    }
  },
  put: async <T = any>(endpoint: string, data: any): Promise<T | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`API error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to PUT to ${endpoint}`, error);
      return null;
    }
  },

  patch: async <T = any>(endpoint: string, data: any): Promise<T | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`API error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to PATCH to ${endpoint}`, error);
      return null;
    }
  },

  delete: async (endpoint: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error(`Failed to DELETE ${endpoint}`, error);
      return false;
    }
  }
};
