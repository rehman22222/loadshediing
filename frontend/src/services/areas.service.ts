import { api } from '@/lib/axios';

export interface AreaOption {
  _id: string;
  name: string;
  city: string;
  outageCount?: number;
}

export const areasService = {
  search: async (search?: string): Promise<AreaOption[]> => {
    const response = await api.get<AreaOption[]>('/areas', {
      params: search ? { q: search } : {},
    });
    return response.data;
  },

  getNearby: async (lat: number, lng: number): Promise<AreaOption[]> => {
    const response = await api.get<AreaOption[]>('/areas/nearby', {
      params: { lat, lng },
    });
    return response.data;
  },

  create: async (name: string, city = 'Karachi'): Promise<AreaOption> => {
    const response = await api.post<AreaOption>('/areas', { name, city });
    return response.data;
  },
};
