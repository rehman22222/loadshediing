import { api } from '@/lib/axios';
import { Outage } from './outages.service';

export interface Report {
  _id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  location: string;
  description: string;
  image?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  status: 'pending' | 'resolved' | 'investigating';
  createdAt: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  premiumUsers: number;
  totalOutages: number;
  totalReports: number;
  resolvedReports: number;
  pendingReports: number;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export const adminService = {
  getAnalytics: async (): Promise<AdminAnalytics> => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },

  createOutage: async (outage: Partial<Outage>): Promise<Outage> => {
    const response = await api.post('/admin/outages', outage);
    return response.data;
  },

  updateOutage: async (id: string, outage: Partial<Outage>): Promise<Outage> => {
    const response = await api.put(`/admin/outages/${id}`, outage);
    return response.data;
  },

  deleteOutage: async (id: string): Promise<void> => {
    await api.delete(`/admin/outages/${id}`);
  },

  getReports: async (): Promise<Report[]> => {
    const response = await api.get('/admin/reports');
    return response.data;
  },

  resolveReport: async (id: string): Promise<Report> => {
    const response = await api.put(`/admin/reports/${id}/resolve`);
    return response.data;
  },
};
