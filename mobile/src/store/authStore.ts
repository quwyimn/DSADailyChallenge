import { create } from 'zustand';
import { persistToken, clearToken, AuthUser } from '../services/api';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;

  // Full login/register: persist token + store user
  setAuth: (token: string, user: AuthUser) => void;
  // App bootstrap: token already on disk, user to be restored by HomeScreen via GET /auth/me
  setTokenOnly: (token: string) => void;
  // Session restoration: token already in memory, just hydrate user without touching SecureStore
  setUser: (user: AuthUser) => void;
  // Log out: clear disk + store
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,

  setAuth: (token, user) => {
    persistToken(token);
    set({ token, user });
  },

  setTokenOnly: (token) => {
    // Token already stored on disk — don't re-write it, just hydrate memory state
    set({ token });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    clearToken();
    set({ token: null, user: null });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
