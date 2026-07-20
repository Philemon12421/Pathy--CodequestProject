import axios, { InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

const _api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

// Cast to any so TypeScript sees Promise<any> return types,
// matching runtime behavior where the interceptor returns res.data.
const api = _api as any;

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (authToken && config.headers) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res: any) => res.data,
  (err: any) => Promise.reject(err.response?.data || err)
);

// Auth
export const authAPI = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  requestPasswordReset: (email: string) => api.post('/auth/forgot-password', { email }),
  verifyResetCode: (email: string, code: string) => api.post('/auth/verify-reset-code', { email, code }),
  resetPassword: (email: string, code: string, password: string) => api.post('/auth/reset-password', { email, code, password }),
  verifyEmail: (email: string, code: string) => api.post('/auth/verify-email', { email, code }),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
};

// Incidents
export const incidentsAPI = {
  getAll: () => api.get('/incidents'),
  create: (formData: any) => api.post('/incidents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string | number, data: any) => api.patch(`/incidents/${id}`, data),
  delete: (id: string | number) => api.delete(`/incidents/${id}`),
};

// Routes
export const routesAPI = {
  getAll: () => api.get('/routes'),
  save: (data: any) => api.post('/routes', data),
  toggleFavorite: (id: string | number) => api.patch(`/routes/${id}/favorite`),
  delete: (id: string | number) => api.delete(`/routes/${id}`),
  leaderboard: () => api.get('/routes/leaderboard'),
  leaderboardWeekly: () => api.get('/routes/leaderboard/weekly'),
};


// AI
export const aiAPI = {
  chat: (message: string, history: any[]) => api.post('/ai/chat', { message, history }),
  getHistory: () => api.get('/ai/history'),
  clearHistory: () => api.delete('/ai/history'),
};

// Music
export const musicAPI = {
  getTracks: () => api.get('/music/tracks'),
  uploadTrack: (formData: any) => api.post('/music/tracks', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteTrack: (id: string | number) => api.delete(`/music/tracks/${id}`),
  getPlaylists: () => api.get('/music/playlists'),
  createPlaylist: (data: any) => api.post('/music/playlists', data),
  addToPlaylist: (id: string | number, data: any) => api.post(`/music/playlists/${id}/tracks`, data),
  getPlaylistTracks: (id: string | number) => api.get(`/music/playlists/${id}/tracks`),
};

// Ads
export const adsAPI = {
  getAll: () => api.get('/ads'),
  getNearby: (lat: number, lng: number) => api.get(`/ads/nearby?lat=${lat}&lng=${lng}`),
  create: (data: any) => api.post('/ads', data),
  checkout: (id: string | number) => api.post(`/ads/${id}/checkout`),
  activate: (id: string | number) => api.post(`/ads/${id}/activate`),
  getMine: () => api.get('/ads/mine'),
  delete: (id: string | number) => api.delete(`/ads/${id}`),
};

// Wallet
export const walletAPI = {
  getMe: () => api.get('/wallet/me'),
  deposit: (amount: number) => api.post('/wallet/deposit', { amount }),
  verify: (reference: string) => api.post('/wallet/verify', { reference }),
};

// Notifications
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: string | number) => api.patch(`/notifications/${id}/read`),
  readAll: () => api.post('/notifications/read-all'),
  delete: (id: string | number) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete('/notifications'),
};

export default api;
