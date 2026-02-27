import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    config.headers = {
      ...config.headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    };

    if ((config.method || 'get').toLowerCase() === 'get') {
      config.params = {
        ...(config.params || {}),
        _t: Date.now(),
      };
    }

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] Request to', config.url);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors and standardize responses
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] Response from', response.config.url, response.status, response.data);
    }
    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] Error from', error.config?.url, error.response?.status, error.response?.data);
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
