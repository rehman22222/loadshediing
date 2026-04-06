import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { outagesService } from '@/services/outages.service';
import { useAuthStore } from '@/store/authStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Layout } from '@/components/Layout';
import { OutageCard } from '@/components/OutageCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';

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
    // We intentionally attempt auto-detection only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    await refetch();
    if (user?.location && isPremium()) {
      await refetchNearby();
    }
    toast.success('Data refreshed');
  };

  const ongoingCount = todayOutages?.filter((outage) => outage.status === 'ongoing').length || 0;
  const scheduledCount = todayOutages?.filter((outage) => outage.status === 'scheduled').length || 0;
  const missingArea = isAxiosError(todayError) && todayError.response?.status === 400;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.username}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ongoing Outages</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ongoingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Active right now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Today</CardTitle>
              <Zap className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scheduledCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Coming up</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Selected Area</CardTitle>
              <MapPin className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user?.area?.name || 'Not set'}</div>
              {!user?.area?.name && (
                <Link to="/profile" className="text-xs text-primary underline underline-offset-4">
                  Choose your area
                </Link>
              )}
              {!user?.location && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-xs mt-2 block"
                  onClick={requestLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? 'Detecting location...' : 'Enable device location'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {missingArea && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-5">
              <h2 className="font-semibold mb-2">Set your area to unlock personalized schedules</h2>
              <p className="text-sm text-muted-foreground mb-3">
                We can only show your exact daily outage schedule after you link your account to an area.
              </p>
              <Link to="/profile">
                <Button size="sm">Open Profile</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {nearbyOutages && nearbyOutages.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Nearby Outages</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {nearbyOutages.slice(0, 4).map((outage) => (
                <OutageCard key={outage._id} outage={outage} />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4">Today's Outages</h2>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <Card key={item}>
                  <CardContent className="p-5">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : todayOutages && todayOutages.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {todayOutages.map((outage) => (
                <OutageCard key={outage._id} outage={outage} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold text-lg mb-2">No outages found</h3>
                <p className="text-muted-foreground">
                  No outage records are currently scheduled for your selected area today.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
