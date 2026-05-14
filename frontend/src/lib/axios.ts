import axios from 'axios';
import { isAxiosError } from 'axios';

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
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
    return 'Request timed out. Please check that the backend server is running.';
  }

  if (error.response?.status === 502 || error.response?.status === 503 || error.response?.status === 504) {
    return 'The server is temporarily unavailable. Please try again in a moment.';
  }

  if (error.message === 'Network Error' || !error.response) {
    return 'Cannot reach the server. Make sure the backend is running on localhost.';
  }

  return fallback;
}
