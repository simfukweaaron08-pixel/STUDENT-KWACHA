import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: `${API_URL}/api/v1` });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('admin_token'),
  user: null,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      const token = data.data.accessToken;
      localStorage.setItem('admin_token', token);
      set({ token, user: data.data.user });
      return true;
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    set({ token: null, user: null });
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/users/me');
      set({ user: data.data });
    } catch {}
  },
}));

export { api };
