import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();
const LAST_WORKSPACE_SLUG_KEY = 'last_workspace_slug';
const REFRESH_TOKEN_KEY = 'refresh_token';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-primary-600 rounded-google flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">R</span>
        </div>
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/api/auth/profile/')
        .then((response) => {
          const profileData = response.data.data || response.data;
          setUser(profileData);
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const register = async (userData) => {
    try {
      const payload = {
        email: userData.username,
        password: userData.password,
        token: userData.token,
        organization: userData.organization,
        full_name: userData.full_name || '',
        turnstile_token: userData.turnstile_token || '',
      };
      const response = await api.post('/api/auth/register/', payload);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const login = async (credentials) => {
    try {
      const preferredOrgSlug = localStorage.getItem(LAST_WORKSPACE_SLUG_KEY);
      const payload = {
        ...credentials,
        ...(preferredOrgSlug ? { preferred_org_slug: preferredOrgSlug } : {}),
      };
      const response = await api.post('/api/auth/login/', payload);
      const responseData = response.data.data || response.data;
      const { access_token, refresh_token, user: userData } = responseData;
      
      if (!access_token || !userData) {
        throw new Error('Invalid response format');
      }
      
      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      if (userData?.organization_slug) {
        localStorage.setItem(LAST_WORKSPACE_SLUG_KEY, userData.organization_slug);
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = async ({ allDevices = false } = {}) => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    try {
      await api.post(allDevices ? '/api/auth/logout-all/' : '/api/auth/logout/', {
        refresh_token: refreshToken || '',
      });
    } catch (error) {
      // Continue local cleanup even if server revocation fails.
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const listWorkspaces = async () => {
    try {
      const response = await api.get('/api/auth/workspaces/');
      return { success: true, data: response.data };
    } catch (error) {
      const status = error.response?.status;
      if (status === 404) {
        return {
          success: false,
          error: 'Workspace switch is not available on this backend yet. Deploy the latest backend update.',
        };
      }
      if (status === 401) {
        return {
          success: false,
          error: 'Session expired. Please sign in again.',
        };
      }
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to load workspaces',
      };
    }
  };

  const requestWorkspaceSwitchCode = async ({ org_slug }) => {
    try {
      const response = await api.post('/api/auth/workspaces/switch/request-code/', { org_slug });
      return { success: true, data: response.data };
    } catch (error) {
      const status = error.response?.status;
      if (status === 404) {
        return {
          success: false,
          error: 'Workspace switch OTP endpoint is unavailable. Deploy latest backend update first.',
        };
      }
      if (status === 429) {
        return {
          success: false,
          error: error.response?.data?.error || 'Too many verification code requests. Try again later.',
        };
      }
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send verification code',
      };
    }
  };

  const switchWorkspace = async ({ org_slug, password, otp_code }) => {
    try {
      const payload = {
        org_slug,
        ...(otp_code ? { otp_code } : {}),
        ...(password ? { password } : {}),
      };
      const response = await api.post('/api/auth/workspaces/switch/', payload);
      const responseData = response.data.data || response.data;
      const { access_token, refresh_token, user: userData } = responseData;

      if (!access_token || !userData) {
        throw new Error('Invalid response format');
      }

      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      if (userData?.organization_slug) {
        localStorage.setItem(LAST_WORKSPACE_SLUG_KEY, userData.organization_slug);
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const status = error.response?.status;
      if (status === 404) {
        return {
          success: false,
          error: 'Workspace switch endpoint is unavailable. Deploy latest backend update first.',
        };
      }
      if (status === 401) {
        return {
          success: false,
          error: error.response?.data?.error || 'Invalid credentials.',
        };
      }
      return {
        success: false,
        error: error.response?.data?.error || 'Workspace switch failed',
      };
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/api/auth/profile/');
      const profileData = response.data.data || response.data;
      setUser(profileData);
      localStorage.setItem('user', JSON.stringify(profileData));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const value = {
    user,
    login,
    register,
    logout,
    listWorkspaces,
    requestWorkspaceSwitchCode,
    switchWorkspace,
    refreshUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
