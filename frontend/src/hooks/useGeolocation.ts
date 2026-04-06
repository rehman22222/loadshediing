import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export interface Coordinates {
  lat: number;
  lng: number;
}

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateLocation = useAuthStore((state) => state.updateLocation);

  const requestLocation = async (): Promise<Coordinates | null> => {
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          updateLocation(coords);
          setLoading(false);
          toast.success('Location detected successfully');
          resolve(coords);
        },
        (err) => {
          let errorMsg = 'Unable to retrieve your location';
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = 'Location permission denied. Please enable location access.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg = 'Location information is unavailable.';
              break;
            case err.TIMEOUT:
              errorMsg = 'Location request timed out.';
              break;
          }
          
          setError(errorMsg);
          setLoading(false);
          toast.error(errorMsg);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  return { requestLocation, loading, error };
};
