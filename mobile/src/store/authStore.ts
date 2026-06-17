import { create } from 'zustand';
import { persistToken, clearToken, AuthUser } from '../services/api';
import { useCacheStore } from './cacheStore';
import { useSessionStore } from './sessionStore';
import { useUiStore } from './uiStore';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  justLoggedIn: boolean;
  isNewUser: boolean;

  // Full login/register: persist token + store user
  setAuth: (token: string, user: AuthUser) => void;
  // App bootstrap: token already on disk, user to be restored by HomeScreen via GET /auth/me
  setTokenOnly: (token: string) => void;
  // Session restoration: token already in memory, just hydrate user without touching SecureStore
  setUser: (user: AuthUser) => void;
  // Log out: clear disk + store
  logout: () => void;
  setLoading: (loading: boolean) => void;
  // Reset after welcome animation plays
  clearJustLoggedIn: () => void;
  // Set by RegisterScreen after first-time registration
  setIsNewUser: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,
  justLoggedIn: false,
  isNewUser: false,

  setAuth: (token, user) => {
    persistToken(token);
    set({ token, user, justLoggedIn: true });
  },

  setTokenOnly: (token) => {
    // Token already stored on disk — don't re-write it, just hydrate memory state
    // justLoggedIn stays false: this is session restore, not a fresh login
    set({ token });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    clearToken();
    useCacheStore.getState().reset();
    useSessionStore.getState().reset();
    useUiStore.getState().reset();
    set({ token: null, user: null, justLoggedIn: false, isNewUser: false });
  },

  setLoading: (isLoading) => set({ isLoading }),

  clearJustLoggedIn: () => set({ justLoggedIn: false }),

  setIsNewUser: (v) => set({ isNewUser: v }),
}));
