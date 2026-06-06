import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Users ─────────────────────────────────────────────────────────────────────

export const createUser = (data) => api.post('/users', data).then(r => r.data);
export const getUser = (id) => api.get(`/users/${id}`).then(r => r.data);

// ── SnapAlert ─────────────────────────────────────────────────────────────────

export const enableSnapAlert = (userId, phoneNumber) =>
  api.post('/snapalert/enable', { user_id: userId, phone_number: phoneNumber }).then(r => r.data);

export const verifySnapAlert = (userId, code) =>
  api.post('/snapalert/verify', { user_id: userId, code }).then(r => r.data);

export const getSnapAlertSettings = (userId) =>
  api.get(`/snapalert/settings/${userId}`).then(r => r.data);

export const updatePreferences = (userId, prefs) =>
  api.post(`/snapalert/preferences/${userId}`, prefs).then(r => r.data);

export const getAlerts = (userId, limit = 20) =>
  api.get(`/snapalert/alerts/${userId}`, { params: { limit } }).then(r => r.data);

export const getStats = (userId) =>
  api.get(`/snapalert/stats/${userId}`).then(r => r.data);

export const markAlertClicked = (alertId) =>
  api.post(`/snapalert/alerts/${alertId}/click`).then(r => r.data);

export const mockTrigger = (userId, city, maxPrice) =>
  api.post('/snapalert/mock-trigger', {
    user_id: userId,
    city: city || undefined,
    max_price: maxPrice || undefined,
  }).then(r => r.data);

export const healthCheck = () => api.get('/health').then(r => r.data);

export default api;
