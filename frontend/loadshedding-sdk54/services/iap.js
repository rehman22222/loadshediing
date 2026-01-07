// services/iap.js
import api from './apiClient.js';

export const getStatus = () => api.get('/iap/status');
export const verifyPurchase = (receipt) => api.post('/iap/verify', { receipt });
