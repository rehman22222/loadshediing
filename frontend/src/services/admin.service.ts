import { api } from '@/lib/axios';

export interface AdminAnalytics {
  totalUsers: number;
  freeUsers: number;
  premiumUsers: number;
  adminUsers: number;
  otherUsers?: number;
  totalAreas: number;
  totalOutages: number;
  importedOutages: number;
  manualOutages: number;
  feedbackCount: number;
  activePurchases: number;
  alertsEnabledUsers: number;
  usersWithArea: number;
  usersWithLocation: number;
  areasWithValidCoords: number;
  missingCoordinateAreas: number;
  areasCoveredCount: number;
  latestImportDate: string | null;
  latestImportCount: number;
  coverageRate: number;
  coordinateQualityRate: number;
  premiumConversionRate: number;
  alertAdoptionRate: number;
  areaSelectionRate: number;
  locationOptInRate: number;
  totalPurchaseVolume: number;
  planBreakdown: Array<{
    name: string;
    value: number;
    percent: number;
  }>;
  outageSourceBreakdown: Array<{
    name: string;
    value: number;
    percent: number;
  }>;
  userGrowth: Array<{
    date: string;
    count: number;
  }>;
  feedbackTrend: Array<{
    date: string;
    count: number;
  }>;
  purchaseTrend: Array<{
    date: string;
    count: number;
  }>;
  outageWindowDistribution: Array<{
    hour: string;
    count: number;
  }>;
  cityCoverage: Array<{
    city: string;
    outages: number;
    areas: number;
  }>;
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
  recentUsers: Array<{
    id: string;
    user: string;
    email: string | null;
    role: string;
    area: string;
    createdAt: string;
  }>;
}

export const adminService = {
  getAnalytics: async (): Promise<AdminAnalytics> => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },
};
