// File: services/iap.js
import api from './apiClient';
export const verifyPurchase = (receipt) => api.post('/iap/verify', { receipt });
export const getStatus = () => api.get('/iap/status');