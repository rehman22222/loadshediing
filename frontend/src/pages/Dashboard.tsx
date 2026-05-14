import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { outagesService } from '@/services/outages.service';
import { useAuthStore } from '@/store/authStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Layout } from '@/components/Layout';
import { OutageCard } from '@/components/OutageCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, Clock3, MapPin, RefreshCw, ShieldCheck, Zap } from 'lucide-react';

const KARACHI_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Karachi',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const KARACHI_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Karachi',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function formatRoutineRange(startTime: string, endTime?: string) {
  const start = KARACHI_TIME_FORMATTER.format(new Date(startTime)).toLowerCase();
  if (!endTime) return `${start} onward`;
  const end = KARACHI_TIME_FORMATTER.format(new Date(endTime)).toLowerCase();
  return `${start} - ${end}`;
}

function getStatusClasses(status: 'scheduled' | 'ongoing' | 'completed') {
  if (status === 'ongoing') {
    return 'border-destructive/35 bg-destructive/10 text-destructive';
  }

  if (status === 'scheduled') {
    return 'border-warning/35 bg-warning/12 text-warning';
  }

  return 'border-success/35 bg-success/10 text-success';
}

export default function Dashboard() {
  const { user, isPremium } = useAuthStore();
  const { requestLocation, loading: locationLoading } = useGeolocation();

  const {
    data: todayOutages,
    isLoading,
    refetch,
    error: todayError,
  } = useQuery({
    queryKey: ['outages', 'today'],
    queryFn: outagesService.getTodayOutages,
    retry: false,
  });

  const { data: nearbyOutages, refetch: refetchNearby } = useQuery({
    queryKey: ['outages', 'nearby', user?.location?.lat, user?.location?.lng],
    queryFn: () => outagesService.getNearbyOutages(user!.location!.lat, user!.location!.lng),
    enabled: Boolean(user?.location && isPremium()),
  });

  useEffect(() => {
    if (!user?.location) {
      void requestLocation();
    }
    // We only auto-request once on initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    await refetch();
    if (user?.location && isPremium()) {
      await refetchNearby();
    }
    toast.success('Routine refreshed');
  };

  const ongoingOutages = todayOutages?.filter((outage) => outage.status === 'ongoing') || [];
  const scheduledOutages = todayOutages?.filter((outage) => outage.status === 'scheduled') || [];
  const nextScheduled = scheduledOutages[0];
  const liveOutage = ongoingOutages[0];
  const missingArea = isAxiosError(todayError) && todayError.response?.status === 400;
  const todayLabel = KARACHI_DATE_FORMATTER.format(new Date());

  return (
    <Layout>
      <div className="space-y-6">
        <section className="utility-panel-strong overflow-hidden">
          <div className="grid gap-0 xl:grid-cols-[1.45fr_0.95fr]">
            <div className="border-b border-border p-4 sm:p-6 xl:border-b-0 xl:border-r xl:p-8">
              <div className="status-chip border-primary/40 bg-primary/10 text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Daily overview
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                <div>
                  <p className="data-label">Daily Routine</p>
                  <h1 className="mt-3 max-w-3xl text-2xl font-bold leading-tight [word-break:break-word] sm:text-4xl lg:text-5xl">
                    See what&apos;s happening now, what&apos;s next, and your full day at a glance.
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                    Your saved area powers a clean daily schedule so you can quickly check active outages, upcoming
                    windows, and the rest of today&apos;s plan from your phone.
                  </p>
                </div>

                <div className="border border-border bg-secondary/55 p-4 sm:p-5">
                  <p className="data-label">Selected Area</p>
                  <p className="mt-3 break-words text-lg font-semibold leading-snug sm:text-xl">
                    {user?.area?.name || 'Choose an area from profile'}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {user?.area?.city || 'Karachi'} schedule
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary" />
                      Built around your saved routine
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="border border-border bg-card p-4 sm:p-5">
                  <p className="data-label">Ongoing Right Now</p>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-3xl font-bold sm:text-4xl">{ongoingOutages.length}</div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {liveOutage
                          ? formatRoutineRange(liveOutage.startTime, liveOutage.endTime)
                          : 'No active outage at this moment'}
                      </p>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                </div>

                <div className="border border-border bg-card p-4 sm:p-5">
                  <p className="data-label">Next Scheduled Slot</p>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-3xl font-bold sm:text-4xl">{scheduledOutages.length}</div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {nextScheduled
                          ? formatRoutineRange(nextScheduled.startTime, nextScheduled.endTime)
                          : 'No more slots left for today'}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-warning" />
                  </div>
                </div>

                <div className="border border-border bg-card p-4 sm:p-5">
                  <p className="data-label">Today&apos;s Total Windows</p>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-3xl font-bold sm:text-4xl">{todayOutages?.length || 0}</div>
                      <p className="mt-2 text-sm text-muted-foreground">{todayLabel} in Karachi time</p>
                    </div>
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 xl:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="data-label">Quick view</p>
                  <h2 className="mt-2 break-words text-xl font-bold sm:text-2xl">Today&apos;s key time slots</h2>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="w-full border-border bg-secondary sm:w-auto sm:self-start"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="mt-6 grid gap-3">
                {(todayOutages || []).map((outage, index) => (
                  <div key={`${outage._id}-overview`} className={`border p-4 ${getStatusClasses(outage.status)}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">
                          Cycle {index + 1}
                        </p>
                        <p className="mt-2 text-lg font-bold">{formatRoutineRange(outage.startTime, outage.endTime)}</p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.22em]">{outage.status}</span>
                    </div>
                  </div>
                ))}

                {!todayOutages?.length && !isLoading && (
                  <div className="border border-dashed border-border bg-secondary/40 p-4 sm:p-5">
                    <p className="text-sm text-muted-foreground">No routine timings are currently available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {missingArea && (
          <Card className="utility-panel border-warning/40 bg-warning/10">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold [word-break:break-word]">Choose your area to unlock a personalized outage routine</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select your main area in profile so your schedule matches the area you actually want to track.
                </p>
              </div>
              <Link to="/profile">
                <Button size="sm" className="w-full sm:w-auto">Open Profile</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="utility-panel p-4 sm:p-6 xl:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="data-label">Today&apos;s Outages</p>
                <h2 className="mt-2 break-words text-2xl font-bold sm:text-3xl">Complete day schedule</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Every time slot for your selected area, clearly marked as completed, active, or still ahead.
                </p>
              </div>
              <div className="border border-border bg-secondary/55 px-4 py-3 sm:min-w-[180px]">
                <p className="data-label">Live Slot</p>
                <p className="mt-1 text-sm font-semibold">
                  {liveOutage
                    ? formatRoutineRange(liveOutage.startTime, liveOutage.endTime)
                    : 'No ongoing outage right now'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {todayOutages?.map((outage, index) => (
                <div
                  key={`${outage._id}-timeline`}
                  className={`max-w-full border px-3 py-3 text-sm font-semibold [word-break:break-word] sm:px-4 ${getStatusClasses(outage.status)}`}
                >
                  <span className="mr-2 text-[11px] uppercase tracking-[0.2em] opacity-70">#{index + 1}</span>
                  {formatRoutineRange(outage.startTime, outage.endTime)}
                </div>
              ))}
            </div>

            <div className="mt-8">
              {isLoading ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {[1, 2, 3, 4].map((item) => (
                    <Card key={item} className="utility-panel">
                      <CardContent className="p-5">
                        <Skeleton className="mb-3 h-6 w-3/4" />
                        <Skeleton className="mb-4 h-4 w-1/2" />
                        <Skeleton className="mb-2 h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : todayOutages && todayOutages.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {todayOutages.map((outage) => (
                    <OutageCard key={outage._id} outage={outage} />
                  ))}
                </div>
              ) : (
                <Card className="utility-panel border-dashed">
                  <CardContent className="p-6 text-center sm:p-10">
                    <Zap className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold">No routine timings found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      No outage timing windows are currently available for your selected area.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="utility-panel p-4 sm:p-6 xl:p-8">
              <p className="data-label">Helpful summary</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">What matters now</h2>

              <div className="mt-6 space-y-4">
                <div className="border border-border bg-secondary/55 p-4 sm:p-5">
                  <p className="data-label">Current Status</p>
                  <p className="mt-2 text-lg font-semibold">
                    {liveOutage ? 'Load shedding is active' : 'Power should currently be available'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {liveOutage
                      ? `Active window: ${formatRoutineRange(liveOutage.startTime, liveOutage.endTime)}`
                      : 'No live outage is scheduled for this moment.'}
                  </p>
                </div>

                <div className="border border-border bg-secondary/55 p-4 sm:p-5">
                  <p className="data-label">Next Action Window</p>
                  <p className="mt-2 text-lg font-semibold">
                    {nextScheduled
                      ? formatRoutineRange(nextScheduled.startTime, nextScheduled.endTime)
                      : 'No more windows today'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use the upcoming page to keep planning beyond the rest of today.
                  </p>
                </div>

                <div className="border border-border bg-secondary/55 p-4 sm:p-5">
                  <p className="data-label">Device Location</p>
                  <p className="mt-2 text-lg font-semibold">
                    {user?.location ? 'Location is on for nearby area suggestions' : 'Optional for nearby area suggestions'}
                  </p>
                  {!user?.location && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-border bg-transparent"
                      onClick={requestLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? 'Detecting location...' : 'Enable device location'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {nearbyOutages && nearbyOutages.length > 0 && (
              <div className="utility-panel p-4 sm:p-6 xl:p-8">
                <p className="data-label">Premium Nearby</p>
                <h2 className="mt-2 text-2xl font-bold">Nearby outages</h2>
                <div className="mt-6 grid gap-4">
                  {nearbyOutages.slice(0, 3).map((outage) => (
                    <OutageCard key={outage._id} outage={outage} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
