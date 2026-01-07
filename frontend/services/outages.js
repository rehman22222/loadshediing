// File: services/outages.js
import api from './apiClient';
export const getTodayOutages = (params = {}) => api.get('/outages/today', { params });
export const getNearbyOutages = (lat, lon, opts = {}) => api.get('/outages/nearby', { params: { lat, lon, ...opts } });
export const getOutageById = (id) => api.get(`/outages/${id}`);