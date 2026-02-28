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
    if (error.response?.status === 402) {
      try {
        const current = Number(localStorage.getItem('paywall_hits') || '0');
        localStorage.setItem('paywall_hits', String(current + 1));
        window.dispatchEvent(new CustomEvent('paywall-hit', { detail: error.response?.data || {} }));
      } catch (eventError) {
        // no-op: paywall nudges are best effort
      }
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
