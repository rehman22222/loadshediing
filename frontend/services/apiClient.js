// File: services/apiClient.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


// IMPORTANT: replace this with your machine's IP when testing on device/emulator
export const API_BASE_URL = 'http://10.0.2.2:5000/api';


const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });


let logoutHandler = null;
export const setLogoutHandler = (cb) => { logoutHandler = cb; };


api.interceptors.request.use(
async (config) => {
const token = await AsyncStorage.getItem('token');
if (token) config.headers.Authorization = `Bearer ${token}`;
return config;
},
(error) => Promise.reject(error)
);


api.interceptors.response.use(
(res) => res,
async (err) => {
// auto-logout on 401
if (err?.response?.status === 401 && logoutHandler) {
try { await logoutHandler(); } catch (e) { /* ignore */ }
}
return Promise.reject(err);
}
);


export default api;


// File: services/auth.js
import api from './apiClient';
export const register = (payload) => api.post('/auth/register', payload);
export const login = (payload) => api.post('/auth/login', payload);
export const me = () => api.get('/auth/me');
export const updatePreferences = (payload) => api.put('/users/me/preferences', payload);
export const getPreferences = () => api.get('/users/me/preferences');