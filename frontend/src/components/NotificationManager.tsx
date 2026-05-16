import { useEffect, useRef } from 'react';
import { outagesService } from '@/services/outages.service';
import { useAuthStore } from '@/store/authStore';

const SENT_KEY_PREFIX = 'powertrack-alert-sent:';

function formatAlertTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(value))
    .toLowerCase();
}

export const NotificationManager = () => {
  const { isAuthenticated, user, isPremium } = useAuthStore();
  const timerIdsRef = useRef<number[]>([]);

  useEffect(() => {
    timerIdsRef.current.forEach((id) => window.clearTimeout(id));
    timerIdsRef.current = [];

    if (!isAuthenticated || !user || !isPremium()) {
      return undefined;
    }

    if (!user.alertPreferences?.enabled || user.alertPreferences.browserPermission !== 'granted') {
      return undefined;
    }

    if (!user.areaId && !user.area?._id) {
      return undefined;
    }

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return undefined;
    }

    let cancelled = false;

    const scheduleAlerts = async () => {
      let upcomingOutages = [];

      try {
        upcomingOutages = await outagesService.getUpcomingOutages();
      } catch {
        return;
      }

      if (cancelled) {
        return;
      }

      const minutesBefore = user.alertPreferences?.minutesBefore || 15;
      for (const outage of upcomingOutages) {
        const alertTime = new Date(outage.startTime).getTime() - minutesBefore * 60 * 1000;
        const delay = alertTime - Date.now();
        const localStorageKey = `${SENT_KEY_PREFIX}${outage._id}:${minutesBefore}`;

        if (delay <= 0 || delay > 24 * 60 * 60 * 1000) {
          continue;
        }

        if (localStorage.getItem(localStorageKey)) {
          continue;
        }

        const timeoutId = window.setTimeout(() => {
          new Notification('PowerTrack reminder', {
            body: `${outage.area}: outage starts at ${formatAlertTime(outage.startTime)}. Prepare 15 minutes early.`,
            tag: `outage-${outage._id}`,
          });
          localStorage.setItem(localStorageKey, new Date().toISOString());
        }, delay);

        timerIdsRef.current.push(timeoutId);
      }
    };

    void scheduleAlerts();
    const intervalId = window.setInterval(() => {
      void scheduleAlerts();
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      timerIdsRef.current.forEach((id) => window.clearTimeout(id));
      timerIdsRef.current = [];
    };
  }, [
    isAuthenticated,
    isPremium,
    user,
    user?.id,
    user?.role,
    user?.alertPreferences?.enabled,
    user?.alertPreferences?.minutesBefore,
    user?.alertPreferences?.browserPermission,
  ]);

  return null;
};
