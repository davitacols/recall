import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  organization_name: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  login: (email: string, password: string, orgSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  applyAuthPayload: (payload: any) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  loading: false,
  initialized: false,
  error: null,

  login: async (email: string, password: string, orgSlug?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.login(email, password, orgSlug);
      const { access_token, user } = response.data;
      
      await AsyncStorage.setItem('access_token', access_token);
      set({ user, token: access_token, loading: false, initialized: true });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Login failed', loading: false });
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('access_token');
    set({ user: null, token: null });
  },

  applyAuthPayload: async (payload: any) => {
    const accessToken = payload?.access_token;
    const user = payload?.user;
    if (!accessToken || !user) {
      throw new Error('Invalid auth payload');
    }
    await AsyncStorage.setItem('access_token', accessToken);
    set({ token: accessToken, user, initialized: true, error: null });
  },

  bootstrap: async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        set({ token });
        const profile = await authService.profile();
        set({ user: profile.data, initialized: true });
        return;
      }
    } catch (error) {
      console.error('Failed to restore token:', error);
      await AsyncStorage.removeItem('access_token');
    }
    set({ token: null, user: null, initialized: true });
  },
}));
