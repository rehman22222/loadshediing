// services/apiClient.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Choose correct API base
export const API_BASE_URL = 'http://192.168.1.36:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let logoutHandler = null;
export const setLogoutHandler = (fn) => (logoutHandler = fn);

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  async (err) => {
    if (err?.response?.status === 401 && logoutHandler) {
      await logoutHandler();
    }
    return Promise.reject(err);
  }
);
export default api;
