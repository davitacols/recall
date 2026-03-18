import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();
const LAST_WORKSPACE_SLUG_KEY = 'last_workspace_slug';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_STORAGE_KEY = 'user';
const ACCESS_TOKEN_KEY = 'access_token';
const LEGACY_TOKEN_KEY = 'token';
const PROFILE_BOOT_TIMEOUT_MS = 5000;
const PUBLIC_BOOTSTRAP_PATHS = new Set([
  '/',
  '/home',
  '/docs',
  '/privacy',
  '/terms',
  '/security-annex',
  '/login',
  '/forgot-password',
  '/reset-password',
]);

function isPublicBootstrapPath(pathname) {
  return PUBLIC_BOOTSTRAP_PATHS.has(pathname);
}

function readStoredUser() {
  if (typeof window === 'undefined') return null;

  try {
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!rawUser) return null;

    const parsedUser = JSON.parse(rawUser);
    return parsedUser && typeof parsedUser === 'object' ? parsedUser : null;
  } catch (error) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

function clearStoredSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  delete api.defaults.headers.common['Authorization'];
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <span className="text-white font-bold text-lg">K</span>
        </div>
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-sm font-medium text-slate-900">Loading your workspace...</p>
        <p className="mt-1 text-sm text-slate-500">Restoring your session and recent context.</p>
      </div>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const isPublicRoute = isPublicBootstrapPath(window.location.pathname);
    const hasToken = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY));
    return hasToken && !isPublicRoute ? readStoredUser() : null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    const isPublicRoute = isPublicBootstrapPath(window.location.pathname);
    if (isPublicRoute) return false;
    const hasToken = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY));
    return hasToken && !readStoredUser();
  });

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    const storedUser = token ? readStoredUser() : null;
    const isPublicRoute = isPublicBootstrapPath(window.location.pathname);

    // On public routes, never block rendering - just set loading false immediately
    if (isPublicRoute) {
      if (storedUser) setUser(storedUser);
      setLoading(false);
      if (!token) return undefined;
    } else {
      if (storedUser) setUser(storedUser);
      if (!token) {
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
        setLoading(false);
        return undefined;
      }
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    if (!isPublicRoute && !storedUser) {
      // loading stays true until profile resolves
    } else {
      setLoading(false);
    }

    const profileRequest = api.get('/api/auth/profile/', { skipAuthRedirect: true });
    const timeoutRequest = new Promise((resolve) => {
      window.setTimeout(() => resolve({ __profileBootTimeout: true }), PROFILE_BOOT_TIMEOUT_MS);
    });

    Promise.race([profileRequest, timeoutRequest])
      .then((result) => {
        if (!active) return;
        if (result?.__profileBootTimeout) {
          setLoading(false);
          return;
        }
        const profileData = result.data.data || result.data;
        setUser(profileData);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profileData));
        if (profileData?.experience_mode) {
          localStorage.setItem('ui_experience_mode', profileData.experience_mode);
        }
        if (profileData?.organization_slug) {
          localStorage.setItem(LAST_WORKSPACE_SLUG_KEY, profileData.organization_slug);
        }
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        if (error.response?.status === 401) {
          clearStoredSession();
          setUser(null);
        } else if (storedUser) {
          setUser(storedUser);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
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
      
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      if (refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      localStorage.setItem(LEGACY_TOKEN_KEY, access_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      if (userData?.organization_slug) {
        localStorage.setItem(LAST_WORKSPACE_SLUG_KEY, userData.organization_slug);
      }
      if (userData?.experience_mode) {
        localStorage.setItem('ui_experience_mode', userData.experience_mode);
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
      clearStoredSession();
      setUser(null);
  };

  const googleLogin = async ({ credential }) => {
    try {
      const preferredOrgSlug = localStorage.getItem(LAST_WORKSPACE_SLUG_KEY);
      const payload = {
        credential,
        ...(preferredOrgSlug ? { preferred_org_slug: preferredOrgSlug } : {}),
      };
      const response = await api.post('/api/auth/google/', payload);
      const responseData = response.data.data || response.data;
      const { access_token, refresh_token, user: userData } = responseData;

      if (!access_token || !userData) {
        throw new Error('Invalid response format');
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      if (refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      localStorage.setItem(LEGACY_TOKEN_KEY, access_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      if (userData?.organization_slug) {
        localStorage.setItem(LAST_WORKSPACE_SLUG_KEY, userData.organization_slug);
      }
      if (userData?.experience_mode) {
        localStorage.setItem('ui_experience_mode', userData.experience_mode);
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Google sign-in failed',
      };
    }
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

      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      if (refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      }
      localStorage.setItem(LEGACY_TOKEN_KEY, access_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      if (userData?.organization_slug) {
        localStorage.setItem(LAST_WORKSPACE_SLUG_KEY, userData.organization_slug);
      }
      if (userData?.experience_mode) {
        localStorage.setItem('ui_experience_mode', userData.experience_mode);
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
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profileData));
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
    googleLogin,
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
