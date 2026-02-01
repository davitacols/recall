import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://recall-backend-4hok.onrender.com/api';

console.log('API_URL configured as:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased timeout for mobile networks
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request logging
api.interceptors.request.use(
  async (config) => {
    console.log('Making API request to:', config.baseURL + config.url);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response logging
api.interceptors.response.use(
  (response) => {
    console.log('API response received:', response.status);
    return response;
  },
  (error) => {
    console.error('API error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('access_token');
    }
    return Promise.reject(error);
  }
);

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
