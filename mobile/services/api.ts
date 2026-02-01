import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login/', { username: email, password }),
  
  register: (email: string, password: string, organization: string) =>
    api.post('/auth/register/', { email, password, organization }),
  
  profile: () => api.get('/auth/profile/'),
};

export const conversationService = {
  list: (params?: any) => api.get('/recall/conversations/', { params }),
  
  get: (id: number) => api.get(`/recall/conversations/${id}/`),
  
  create: (data: any) => api.post('/recall/conversations/', data),
  
  update: (id: number, data: any) => api.put(`/recall/conversations/${id}/`, data),
  
  context: (id: number) => api.get(`/recall/conversations/${id}/context/`),
};

export const decisionService = {
  list: (params?: any) => api.get('/recall/decisions/', { params }),
  
  get: (id: number) => api.get(`/recall/decisions/${id}/`),
  
  create: (data: any) => api.post('/recall/decisions/', data),
};

export const sprintService = {
  list: (params?: any) => api.get('/agile/sprints/', { params }),
  
  get: (id: number) => api.get(`/agile/sprints/${id}/`),
  
  issues: (sprintId: number) => api.get(`/agile/sprints/${sprintId}/issues/`),
};

export const issueService = {
  list: (params?: any) => api.get('/agile/issues/', { params }),
  
  get: (id: number) => api.get(`/agile/issues/${id}/`),
  
  update: (id: number, data: any) => api.put(`/agile/issues/${id}/`, data),
};

export default api;
