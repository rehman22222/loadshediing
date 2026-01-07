import api from './apiClient.js';

export const register = (body) => api.post('/auth/register', body);
export const login = (body) => api.post('/auth/login', body);
export const me = () => api.get('/auth/me');
export const getPreferences = () => api.get('/users/me/preferences');
export const updatePreferences = (p) => api.put('/users/me/preferences', p);
