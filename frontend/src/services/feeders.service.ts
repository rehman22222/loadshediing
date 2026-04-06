import { api } from '@/lib/axios';

export interface Feeder {
  _id: string;
  name: string;
  code: string;
  city: string;
  area: string;
  capacity: number;
  status: 'active' | 'maintenance' | 'offline';
  location: {
    lat: number;
    lng: number;
  };
  connectedCustomers?: number;
  lastMaintenance?: string;
}

export const feedersService = {
  getFeeders: async (): Promise<Feeder[]> => {
    const response = await api.get('/feeders');
    return response.data;
  },

  createFeeder: async (feeder: Partial<Feeder>): Promise<Feeder> => {
    const response = await api.post('/feeders', feeder);
    return response.data;
  },

  updateFeeder: async (id: string, feeder: Partial<Feeder>): Promise<Feeder> => {
    const response = await api.put(`/feeders/${id}`, feeder);
    return response.data;
  },

  deleteFeeder: async (id: string): Promise<void> => {
    await api.delete(`/feeders/${id}`);
  },
};
