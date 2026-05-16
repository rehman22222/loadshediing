import { api } from '@/lib/axios';
import type { AreaOption } from '@/services/areas.service';

export interface Outage {
  _id: string;
  area: string;
  city: string;
  feeder?: string | null;
  startTime: string;
  endTime?: string;
  status: 'scheduled' | 'ongoing' | 'completed';
  location?: {
    lat: number;
    lng: number;
  } | null;
  note?: string;
}

export interface OutageReport {
  location: string;
  description: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface RawOutage {
  _id: string;
  area: string;
  city?: string;
  feeder?: string | null;
  startTime: string;
  endTime?: string;
  status: Outage['status'];
  location?: {
    lat: number;
    lng: number;
  } | null;
  areaId?: {
    city?: string;
  };
  note?: string;
}

interface RawOutageSearchResult {
  area: AreaOption & {
    matchScore?: number;
  };
  outages: RawOutage[];
}

export interface OutageSearchResult {
  area: AreaOption & {
    matchScore?: number;
  };
  outages: Outage[];
}

function normalizeOutage(outage: RawOutage): Outage {
  return {
    _id: outage._id,
    area: outage.area,
    city: outage.city || outage.areaId?.city || 'Karachi',
    feeder: outage.feeder || null,
    startTime: outage.startTime,
    endTime: outage.endTime,
    status: outage.status,
    location: outage.location
      ? {
          lat: outage.location.lat,
          lng: outage.location.lng,
        }
      : null,
    note: outage.note,
  };
}

export const outagesService = {
  getTodayOutages: async (): Promise<Outage[]> => {
    const response = await api.get('/outages/today');
    return response.data.map(normalizeOutage);
  },

  getUpcomingOutages: async (): Promise<Outage[]> => {
    const response = await api.get('/outages/upcoming');
    return response.data.map(normalizeOutage);
  },

  getNearbyOutages: async (lat: number, lng: number): Promise<Outage[]> => {
    const response = await api.get('/outages/nearby', {
      params: { lat, lng },
    });
    return response.data.map(normalizeOutage);
  },

  getOutagesByCity: async (city: string): Promise<Outage[]> => {
    const response = await api.get(`/outages/city/${encodeURIComponent(city)}`);
    return response.data.map(normalizeOutage);
  },

  searchByArea: async (search: string): Promise<OutageSearchResult[]> => {
    const response = await api.get<{ data: RawOutageSearchResult[] }>('/outages/search', {
      params: { q: search, limit: 6 },
    });

    return response.data.data.map((result) => ({
      area: result.area,
      outages: result.outages.map(normalizeOutage),
    }));
  },

  reportOutage: async (report: OutageReport): Promise<Outage> => {
    const response = await api.post('/outages', {
      location: report.location,
      description: report.description,
      latitude: report.coordinates?.lat,
      longitude: report.coordinates?.lng,
    });

    return normalizeOutage(response.data);
  },
};
