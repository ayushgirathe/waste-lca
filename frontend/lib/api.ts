import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (email: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  const res = await api.post('/auth/token', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  localStorage.setItem('access_token', res.data.access_token);
  return res.data;
};

export const register = async (email: string, password: string) => {
  const res = await api.post('/auth/register', null, { params: { email, password } });
  return res.data;
};

export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/upload/', formData);
  return res.data;
};

export const getRecommendations = async (materials: string[], preference: string) => {
  const res = await api.post('/recommend/', { materials, preference });
  return res.data.routes;
};

export const logout = () => {
  localStorage.removeItem('access_token');
};