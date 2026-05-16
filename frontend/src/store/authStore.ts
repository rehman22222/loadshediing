import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'free' | 'premium' | 'admin';

export const AUTH_STORAGE_KEY = 'auth-storage';
const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'user';

export interface User {
  id: string;
  email: string;
  phoneNumber: string;
  username: string;
  role: UserRole;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  areaId?: string | null;
  area?: {
    _id: string;
    name: string;
    city: string;
  } | null;
  watchedAreaIds?: string[];
  watchedAreas?: Array<{
    _id: string;
    name: string;
    city: string;
  }>;
  areaSelectedAt?: string | null;
  lastAreaChangeAt?: string | null;
  alertPreferences?: {
    enabled: boolean;
    minutesBefore: number;
    browserPermission: 'default' | 'granted' | 'denied';
  };
  canManageMultipleAreas?: boolean;
  freeAreaLocked?: boolean;
  location?: {
    lat: number;
    lng: number;
    city?: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  updateLocation: (location: User['location']) => void;
  isPremium: () => boolean;
  isAdmin: () => boolean;
}

const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setAuth: (user, token) => {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },
      updateUser: (userUpdate) => {
        const current = get().user;
        if (!current) return;

        const updatedUser = { ...current, ...userUpdate };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        set({ user: updatedUser });
      },
      logout: () => {
        clearAuthStorage();
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateLocation: (location) => {
        const current = get().user;
        if (!current) return;

        const updatedUser = { ...current, location };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        set({ user: updatedUser });
      },
      isPremium: () => {
        const role = get().user?.role;
        return role === 'premium' || role === 'admin';
      },
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
