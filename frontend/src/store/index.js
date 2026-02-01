import { createSlice, configureStore, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchConversations = createAsyncThunk(
  'conversations/fetchConversations',
  async ({ orgId, filters = {} }) => {
    const response = await api.get(`/api/recall/conversations/`, { params: filters });
    return response.data;
  }
);

export const fetchDecisions = createAsyncThunk(
  'decisions/fetchDecisions',
  async ({ orgId, filters = {} }) => {
    const response = await api.get(`/api/recall/decisions/`, { params: filters });
    return response.data;
  }
);

export const fetchUser = createAsyncThunk(
  'auth/fetchUser',
  async () => {
    const response = await api.get('/api/auth/me/');
    return response.data;
  }
);

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.results || action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

const decisionsSlice = createSlice({
  name: 'decisions',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDecisions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDecisions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.results || action.payload;
      })
      .addCase(fetchDecisions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        state.isAuthenticated = false;
      });
  },
});

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    darkMode: false,
    notifications: [],
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    addNotification: (state, action) => {
      state.notifications.push(action.payload);
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
  },
});

export const store = configureStore({
  reducer: {
    conversations: conversationsSlice.reducer,
    decisions: decisionsSlice.reducer,
    auth: authSlice.reducer,
    ui: uiSlice.reducer,
  },
});

export const { toggleSidebar, toggleDarkMode, addNotification, removeNotification } = uiSlice.actions;
