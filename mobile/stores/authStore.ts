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
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.login(email, password);
      const { access_token, user } = response.data;
      
      await AsyncStorage.setItem('access_token', access_token);
      set({ user, token: access_token, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Login failed', loading: false });
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('access_token');
    set({ user: null, token: null });
  },

  restoreToken: async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        set({ token });
      }
    } catch (error) {
      console.error('Failed to restore token:', error);
    }
  },
}));
