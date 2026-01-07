// services/outages.js
import api from './apiClient.js';

export const getTodayOutages = () => api.get('/outages/today');
export const getNearbyOutages = (lat, lon, opts = {}) =>
  api.get('/outages/nearby', { params: { lat, lon, ...opts } });
export const getOutageById = (id) => api.get(`/outages/${id}`);