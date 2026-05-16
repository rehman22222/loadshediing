import axios from 'axios';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

function normalizeBaseUrl(url: string) {
  const trimmed = url.replace(/\/+$/, '');

  try {
    const parsed = new URL(trimmed);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/api';
    } else if (!parsed.pathname.endsWith('/api')) {
      parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/api`;
    }

    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
}

const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : normalizeBaseUrl(import.meta.env.VITE_API_URL || '/api');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthFormRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/verify-email-otp') ||
      requestUrl.includes('/auth/resend-email-otp');

    if (error.response?.status === 401 && !isAuthFormRequest) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) {
    return fallback;
  }

  const responseMessage =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.response?.data?.msg;

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage;
  }

  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. The backend may still be waking up. Please try again in a moment.';
  }

  if (error.response?.status === 502 || error.response?.status === 503 || error.response?.status === 504) {
    return 'The server is temporarily unavailable. Please try again in a moment.';
  }

  if (error.message === 'Network Error' || !error.response) {
    return 'Cannot reach the server. Make sure the backend is running on localhost.';
  }

  return fallback;
}
