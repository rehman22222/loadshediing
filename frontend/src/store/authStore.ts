import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'free' | 'premium' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  areaId?: string | null;
  area?: {
    _id: string;
    name: string;
    city: string;
  } | null;
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
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  updateLocation: (location: User['location']) => void;
  isPremium: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },
      updateUser: (userUpdate) => {
        const current = get().user;
        if (!current) return;

        const updatedUser = { ...current, ...userUpdate };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      },
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateLocation: (location) => {
        const current = get().user;
        if (!current) return;

        const updatedUser = { ...current, location };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      },
      isPremium: () => {
        const role = get().user?.role;
        return role === 'premium' || role === 'admin';
      },
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'auth-storage',
    }
  )
);
