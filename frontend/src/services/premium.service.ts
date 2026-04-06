import { api } from '@/lib/axios';

export interface Analytics {
  totalOutages: number;
  avgDuration: number;
  peakHours: Array<{ hour: number; count: number }>;
  mostAffectedAreas: Array<{ area: string; count: number }>;
  outagesByMonth: Array<{ month: string; count: number }>;
  trends: {
    weekday: number[];
    timeOfDay: number[];
  };
}

export const premiumService = {
  upgradeToPremium: async (): Promise<unknown> => {
    const response = await api.post('/premium/upgrade');
    return response.data;
  },

  getAnalytics: async (): Promise<Analytics> => {
    const response = await api.get('/premium/analytics');
    return response.data;
  },
};
