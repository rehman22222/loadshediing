import { api } from '@/lib/axios';
import { User } from '@/store/authStore';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

interface RawArea {
  _id?: string;
  name?: string;
  city?: string;
}

interface RawUser {
  id?: string;
  _id?: string;
  email: string;
  username?: string;
  name?: string;
  role?: User['role'];
  areaId?: string | RawArea | null;
  area?: RawArea | null;
  location?: User['location'];
}

function normalizeUser(raw: RawUser): User {
  return {
    id: raw.id || raw._id,
    email: raw.email,
    username: raw.username || raw.name,
    role: raw.role || 'free',
    areaId:
      typeof raw.areaId === 'string'
        ? raw.areaId
        : raw.areaId?._id || raw.area?._id || null,
    area:
      raw.area ||
      (raw.areaId && typeof raw.areaId === 'object'
        ? {
            _id: raw.areaId._id,
            name: raw.areaId.name,
            city: raw.areaId.city,
          }
        : null),
    location: raw.location,
  };
}

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return {
      ...response.data,
      user: normalizeUser(response.data.user),
    };
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return {
      ...response.data,
      user: normalizeUser(response.data.user),
    };
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/profile');
    return normalizeUser(response.data.user);
  },

  updateArea: async (areaId: string): Promise<User> => {
    const response = await api.put('/auth/update-area', { areaId });
    return normalizeUser(response.data.user);
  },
};
