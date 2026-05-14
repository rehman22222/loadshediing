import { api } from '@/lib/axios';

export interface AdminAnalytics {
  totalUsers: number;
  freeUsers: number;
  premiumUsers: number;
  adminUsers: number;
  totalAreas: number;
  totalOutages: number;
  importedOutages: number;
  feedbackCount: number;
  activePurchases: number;
  alertsEnabledUsers: number;
  latestImportDate: string | null;
  topAreas: Array<{
    area: string;
    count: number;
  }>;
  importBatches: Array<{
    date: string;
    count: number;
  }>;
  recentFeedback: Array<{
    id: string;
    message: string;
    area: string;
    user: string;
    createdAt: string;
  }>;
  recentPurchases: Array<{
    id: string;
    user: string;
    email: string | null;
    planId: string;
    paymentMethod: string;
    status: string;
    amount: number;
    createdAt: string;
  }>;
}

export const adminService = {
  getAnalytics: async (): Promise<AdminAnalytics> => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },
};
