import { api } from '@/lib/axios';
import { User } from '@/store/authStore';

export interface PremiumPlan {
  id: string;
  name: string;
  interval: string;
  amount: number;
  currency: string;
  description: string;
}

export interface PaymentMethod {
  id: string;
  label: string;
  provider: string;
}

export interface PremiumCatalog {
  plans: PremiumPlan[];
  paymentMethods: PaymentMethod[];
  mode: 'placeholder';
  message: string;
}

export interface SubscriptionStatus {
  role: User['role'];
  activePurchase: {
    _id: string;
    planId?: string;
    paymentMethod?: string;
    status?: string;
    expiryDate?: string;
  } | null;
  plans: PremiumPlan[];
}

export interface CheckoutResponse {
  ok: boolean;
  mode: 'placeholder';
  message: string;
  purchase: {
    _id: string;
    planId?: string;
    paymentMethod?: string;
    expiryDate?: string;
  };
  user: User;
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
  role?: User['role'];
  areaId?: string | RawArea | null;
  area?: RawArea | null;
  watchedAreaIds?: Array<string | RawArea>;
  watchedAreas?: RawArea[];
  areaSelectedAt?: string | null;
  lastAreaChangeAt?: string | null;
  alertPreferences?: User['alertPreferences'];
  canManageMultipleAreas?: boolean;
  freeAreaLocked?: boolean;
  location?: User['location'];
}

function normalizeUser(raw: RawUser): User {
  const watchedAreas =
    raw.watchedAreas ||
    raw.watchedAreaIds?.filter((item): item is RawArea => typeof item === 'object' && item !== null) ||
    [];

  return {
    id: raw.id || raw._id,
    email: raw.email,
    username: raw.username || '',
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
    watchedAreaIds: raw.watchedAreaIds?.map((item) => (typeof item === 'string' ? item : item._id)).filter(Boolean) || [],
    watchedAreas: watchedAreas.map((item) => ({
      _id: item._id,
      name: item.name,
      city: item.city,
    })),
    areaSelectedAt: raw.areaSelectedAt || null,
    lastAreaChangeAt: raw.lastAreaChangeAt || null,
    alertPreferences: raw.alertPreferences || {
      enabled: false,
      minutesBefore: 15,
      browserPermission: 'default',
    },
    canManageMultipleAreas: raw.canManageMultipleAreas ?? (raw.role === 'premium' || raw.role === 'admin'),
    freeAreaLocked: raw.freeAreaLocked ?? false,
    location: raw.location,
  };
}

export const premiumService = {
  getCatalog: async (): Promise<PremiumCatalog> => {
    const response = await api.get('/subscriptions/plans');
    return response.data;
  },

  getStatus: async (): Promise<SubscriptionStatus> => {
    const response = await api.get('/subscriptions/status');
    return response.data;
  },

  checkoutPlaceholder: async (payload: {
    planId: string;
    paymentMethod: string;
  }): Promise<CheckoutResponse> => {
    const response = await api.post('/subscriptions/checkout', payload);
    return {
      ...response.data,
      user: normalizeUser(response.data.user),
    };
  },
};
