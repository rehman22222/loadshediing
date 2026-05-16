import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Bell, Clock3, Crown, LocateFixed, Lock, MapPin, Sparkles } from 'lucide-react';

import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { areasService } from '@/services/areas.service';
import { authService } from '@/services/auth.service';
import { outagesService } from '@/services/outages.service';
import { useAuthStore } from '@/store/authStore';

function getApiError(error: unknown, fallback: string) {
  if (isAxiosError<{ error?: string; message?: string; msg?: string }>(error)) {
    return error.response?.data?.message || error.response?.data?.msg || error.response?.data?.error || fallback;
  }

  return fallback;
}

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

export default function Profile() {
  const { user, updateUser, isPremium } = useAuthStore();
  const { requestLocation, loading: locationLoading } = useGeolocation();
  const [search, setSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(user?.areaId || '');
  const searchTerm = search.trim();

  const isPremiumUser = isPremium();
  const currentPermission =
    user?.alertPreferences?.browserPermission ||
    (typeof Notification !== 'undefined' ? Notification.permission : 'default');

  const { data: areas = [], isLoading, error } = useQuery({
    queryKey: ['areas', search],
    queryFn: () => areasService.search(search),
  });

  const nearbyAreasQuery = useQuery({
    queryKey: ['areas', 'nearby', user?.location?.lat, user?.location?.lng],
    queryFn: () => areasService.getNearby(user!.location!.lat, user!.location!.lng),
    enabled: Boolean(user?.location?.lat && user?.location?.lng),
  });

  const outageSearchQuery = useQuery({
    queryKey: ['outages', 'area-search', searchTerm],
    queryFn: () => outagesService.searchByArea(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 30_000,
  });

  const selectedArea = useMemo(() => {
    return (
      areas.find((area) => area._id === selectedAreaId) ||
      outageSearchQuery.data?.find((result) => result.area._id === selectedAreaId)?.area ||
      nearbyAreasQuery.data?.find((area) => area._id === selectedAreaId) ||
      user?.area ||
      null
    );
  }, [areas, outageSearchQuery.data, nearbyAreasQuery.data, selectedAreaId, user?.area]);

  const watchAreas = user?.watchedAreas || [];
  const freeAreaLocked = Boolean(user?.freeAreaLocked && user?.areaId && selectedAreaId && selectedAreaId !== user.areaId);

  const createAreaMutation = useMutation({
    mutationFn: (name: string) => areasService.create(name),
    onSuccess: (createdArea) => {
      setSelectedAreaId(createdArea._id);
      toast.success(`Created area "${createdArea.name}".`);
    },
    onError: (error: unknown) => {
      toast.error(getApiError(error, 'Failed to create area'));
    },
  });

  const savePrimaryAreaMutation = useMutation({
    mutationFn: authService.updateArea,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      setSelectedAreaId(updatedUser.areaId || '');
      toast.success('Primary area saved successfully.');
    },
    onError: (error: unknown) => {
      toast.error(getApiError(error, 'Failed to update area'));
    },
  });

  const preferencesMutation = useMutation({
    mutationFn: authService.updatePreferences,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success('Preferences updated successfully.');
    },
    onError: (error: unknown) => {
      toast.error(getApiError(error, 'Failed to update preferences'));
    },
  });

  const addWatchAreaMutation = useMutation({
    mutationFn: authService.addWatchArea,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success('Watch area added.');
    },
    onError: (error: unknown) => {
      toast.error(getApiError(error, 'Failed to add watch area'));
    },
  });

  const removeWatchAreaMutation = useMutation({
    mutationFn: authService.removeWatchArea,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success('Watch area removed.');
    },
    onError: (error: unknown) => {
      toast.error(getApiError(error, 'Failed to remove watch area'));
    },
  });

  const handleDetectArea = async () => {
    const coords = await requestLocation();
    if (!coords) return;

    await preferencesMutation.mutateAsync({
      location: coords,
    });
    await nearbyAreasQuery.refetch();
  };

  const handleToggleAlerts = async (enabled: boolean) => {
    if (!isPremiumUser && enabled) {
      toast.error('15-minute outage reminders are available on the premium plan.');
      return;
    }

    let browserPermission = currentPermission;

    if (enabled && typeof Notification !== 'undefined') {
      browserPermission = await Notification.requestPermission();
      if (browserPermission !== 'granted') {
        toast.error('Browser notification permission is required for reminders.');
      }
    }

    await preferencesMutation.mutateAsync({
      alertPreferences: {
        enabled: enabled && browserPermission === 'granted',
        minutesBefore: 15,
        browserPermission,
      },
    });
  };

  const results = areas;
  const outageSearchResults = outageSearchQuery.data || [];

  return (
    <Layout>
      <div className="space-y-6">
        <section className="utility-panel-strong p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div>
              <div className="status-chip border-primary/40 bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Account settings
              </div>
              <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                Set your area, reminders, and nearby suggestions in one place.
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
                Location is only used to suggest nearby areas. You stay in control of the final area used across your
                dashboard and reminders.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="border border-border bg-secondary/55 p-4">
                <p className="data-label">Plan</p>
                <p className="mt-2 text-2xl font-semibold">{isPremiumUser ? 'Premium Access' : 'Free Plan'}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isPremiumUser
                    ? 'Multiple watched areas and 15-minute reminders enabled.'
                    : 'One active area only. Upgrade to manage more areas and reminders.'}
                </p>
              </div>
              <div className="border border-border bg-secondary/55 p-4">
                <p className="data-label">Account</p>
                <p className="mt-2 font-semibold">{user?.username}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="utility-panel">
            <CardHeader>
              <CardTitle>Auto-detect and confirm</CardTitle>
              <CardDescription>
                Detect your location to see nearby area matches before choosing your main tracked area.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleDetectArea} disabled={locationLoading || preferencesMutation.isPending}>
                <LocateFixed className="mr-2 h-4 w-4" />
                {locationLoading ? 'Detecting location...' : 'Detect my location'}
              </Button>

              <div className="grid gap-3">
                {(nearbyAreasQuery.data || []).map((area) => (
                  <div
                    key={area._id}
                    className="flex flex-col gap-3 border border-border bg-secondary/55 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{area.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {area.city} | {area.outageCount || 0} routine slots
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedAreaId(area._id)}>
                      Use this area
                    </Button>
                  </div>
                ))}

                {user?.location && !nearbyAreasQuery.data?.length && (
                  <div className="border border-dashed border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
                    No nearby schedule areas were found from your current location. Search manually below.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="utility-panel">
            <CardHeader>
              <CardTitle>Reminder settings</CardTitle>
              <CardDescription>
                Premium users can receive a reminder 15 minutes before the next scheduled outage window.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 border border-border bg-secondary/55 p-4">
                <div>
                  <p className="font-semibold">15-minute outage reminder</p>
                  <p className="text-sm text-muted-foreground">Browser permission: {currentPermission}</p>
                </div>
                <Switch
                  checked={Boolean(user?.alertPreferences?.enabled)}
                  onCheckedChange={handleToggleAlerts}
                  disabled={preferencesMutation.isPending || (!isPremiumUser && !user?.alertPreferences?.enabled)}
                />
              </div>

              {!isPremiumUser && (
                <div className="border border-warning/40 bg-warning/10 p-4 text-sm text-muted-foreground">
                  Premium is required for reminders and extra watch areas.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="utility-panel">
            <CardHeader>
              <CardTitle>Primary area</CardTitle>
              <CardDescription>
                Search available areas, confirm the best match, and save it as your main outage schedule.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="area-search">Search schedule areas</Label>
                <Input
                  id="area-search"
                  placeholder="Search by area name"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="max-h-96 space-y-3 overflow-auto">
                {isLoading ? (
                  <div className="border border-border bg-secondary/35 p-4 text-sm text-muted-foreground">Loading areas...</div>
                ) : error ? (
                  <div className="border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    {getApiError(error, 'Unable to load areas.')}
                  </div>
                ) : results.length > 0 ? (
                  results.map((area) => {
                    const isSelected = selectedAreaId === area._id;
                    const isWatched = Boolean(user?.watchedAreaIds?.includes(area._id));

                    return (
                      <div
                        key={area._id}
                        className={`border p-4 ${isSelected ? 'border-primary bg-primary/10' : 'border-border bg-secondary/35'}`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-semibold">{area.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {area.city} | {area.outageCount || 0} routine slots
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => setSelectedAreaId(area._id)}>
                              Select
                            </Button>
                            {isPremiumUser && (
                              <Button
                                variant="secondary"
                                onClick={() => addWatchAreaMutation.mutate(area._id)}
                                disabled={isWatched || addWatchAreaMutation.isPending}
                              >
                                {isWatched ? 'Watching' : 'Add watch area'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-3 border border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
                    <p>No matching areas found.</p>
                    {search.trim() && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => createAreaMutation.mutate(search.trim())}
                        disabled={createAreaMutation.isPending}
                      >
                        {createAreaMutation.isPending ? 'Creating area...' : `Create "${search.trim()}" in Karachi`}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {searchTerm.length >= 2 && (
                <div className="border border-border bg-secondary/55 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="data-label">Matching outage schedules</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {outageSearchQuery.isLoading
                          ? 'Searching routine windows...'
                          : `${outageSearchResults.length} area match${outageSearchResults.length === 1 ? '' : 'es'}`}
                      </p>
                    </div>
                    <Clock3 className="h-4 w-4 text-primary" />
                  </div>

                  <div className="mt-4 space-y-3">
                    {outageSearchQuery.isLoading ? (
                      <div className="border border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
                        Loading outage timings...
                      </div>
                    ) : outageSearchQuery.error ? (
                      <div className="border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                        {getApiError(outageSearchQuery.error, 'Unable to load outage timings.')}
                      </div>
                    ) : outageSearchResults.length > 0 ? (
                      outageSearchResults.map((result) => {
                        const isSelected = selectedAreaId === result.area._id;

                        return (
                          <div
                            key={result.area._id}
                            className={`border p-4 ${isSelected ? 'border-primary bg-primary/10' : 'border-border bg-secondary/35'}`}
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="font-semibold">{result.area.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {result.area.city} | {result.outages.length || result.area.outageCount || 0} routine slots
                                </p>
                              </div>
                              <Button variant="outline" onClick={() => setSelectedAreaId(result.area._id)}>
                                Select
                              </Button>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {result.outages.length > 0 ? (
                                result.outages.map((outage, index) => (
                                  <div
                                    key={outage._id}
                                    className="border border-border bg-card px-3 py-2 text-sm font-semibold"
                                  >
                                    <span className="mr-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                      #{index + 1}
                                    </span>
                                    {formatRoutineRange(outage.startTime, outage.endTime)}
                                  </div>
                                ))
                              ) : (
                                <div className="border border-dashed border-border bg-secondary/35 p-3 text-sm text-muted-foreground sm:col-span-2">
                                  No outage timings are saved for this area yet.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="border border-dashed border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
                        No outage schedule matches found.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border border-border bg-secondary/55 p-4">
                <p className="data-label">Selected primary area</p>
                <p className="mt-2 text-lg font-semibold">
                  {selectedArea ? `${selectedArea.name}, ${selectedArea.city}` : 'No area selected yet'}
                </p>
                {user?.role === 'free' && user?.area && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Free plan keeps one active area. Upgrade to premium if you want to switch or monitor more areas.
                  </p>
                )}
              </div>

              {freeAreaLocked && (
                <div className="flex items-start gap-3 border border-warning/40 bg-warning/10 p-4 text-sm text-muted-foreground">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p>
                    Your free account already has an active area. Upgrade to premium if you want to change it or monitor
                    multiple areas.
                  </p>
                </div>
              )}

              <Button
                onClick={() => savePrimaryAreaMutation.mutate(selectedAreaId)}
                disabled={!selectedAreaId || savePrimaryAreaMutation.isPending || freeAreaLocked}
              >
                {savePrimaryAreaMutation.isPending ? 'Saving...' : 'Save primary area'}
              </Button>
            </CardContent>
          </Card>

          <Card className="utility-panel">
            <CardHeader>
              <CardTitle>Watch areas</CardTitle>
              <CardDescription>
                Premium users can save extra areas for easier monitoring and planning.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {watchAreas.length > 0 ? (
                watchAreas.map((area) => (
                  <div
                    key={area._id}
                    className="flex items-center justify-between gap-3 border border-border bg-secondary/55 p-4"
                  >
                    <div>
                      <p className="font-semibold">{area.name}</p>
                      <p className="text-sm text-muted-foreground">{area.city}</p>
                    </div>
                    {isPremiumUser ? (
                      <Button
                        variant="outline"
                        onClick={() => removeWatchAreaMutation.mutate(area._id)}
                        disabled={removeWatchAreaMutation.isPending}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Crown className="h-4 w-4 text-warning" />
                    )}
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
                  {isPremiumUser
                    ? 'No extra watch areas saved yet.'
                    : 'Upgrade to premium to watch additional areas.'}
                </div>
              )}

              {!isPremiumUser && (
                <div className="border border-primary/30 bg-primary/10 p-4 text-sm text-muted-foreground">
                  Premium unlocks more area monitoring and reminder support.
                </div>
              )}

              {isPremiumUser && user?.location && (
                <div className="flex items-start gap-3 border border-border bg-secondary/55 p-4 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>Your last detected location is saved and used for nearby area suggestions.</p>
                </div>
              )}

              {isPremiumUser && (
                <div className="flex items-start gap-3 border border-border bg-secondary/55 p-4 text-sm text-muted-foreground">
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>Once reminders are enabled, PowerTrack prepares 15-minute browser notifications for upcoming outages.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
