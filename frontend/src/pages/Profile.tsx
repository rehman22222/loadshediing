import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/axios';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';

interface Area {
  _id: string;
  name: string;
  city: string;
}

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(user?.areaId || '');

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['areas', search],
    queryFn: async () => {
      const response = await api.get<Area[]>('/areas', {
        params: search ? { q: search } : {},
      });
      return response.data;
    },
  });

  const selectedArea = useMemo(
    () => areas.find((area) => area._id === selectedAreaId) || user?.area || null,
    [areas, selectedAreaId, user?.area]
  );

  const updateAreaMutation = useMutation({
    mutationFn: authService.updateArea,
    onSuccess: (updatedUser) => {
      const areaFromList = areas.find((area) => area._id === updatedUser.areaId) || selectedArea;
      updateUser({
        ...updatedUser,
        area: areaFromList
          ? { _id: areaFromList._id, name: areaFromList.name, city: areaFromList.city }
          : updatedUser.area,
      });
      toast.success('Area updated successfully.');
    },
    onError: (error: unknown) => {
      const message = isAxiosError<{ message?: string; msg?: string }>(error)
        ? error.response?.data?.message || error.response?.data?.msg
        : undefined;
      toast.error(message || 'Failed to update area');
    },
  });

  return (
    <Layout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-1">
            Choose your service area so the dashboard can show your personalized outage schedule.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Basic account information from the auth service.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Username</Label>
              <Input value={user?.username || ''} disabled />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Area</CardTitle>
            <CardDescription>Search existing areas already stored in MongoDB and attach one to your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="area-search">Search area</Label>
              <Input
                id="area-search"
                placeholder="Search by area name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="rounded-lg border max-h-80 overflow-auto divide-y">
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading areas...</div>
              ) : areas.length > 0 ? (
                areas.map((area) => {
                  const isSelected = selectedAreaId === area._id;
                  return (
                    <button
                      key={area._id}
                      type="button"
                      className={`w-full text-left p-4 transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                      onClick={() => setSelectedAreaId(area._id)}
                    >
                      <div className="font-medium">{area.name}</div>
                      <div className="text-sm text-muted-foreground">{area.city}</div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-sm text-muted-foreground">No matching areas found.</div>
              )}
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-medium">Current selection</p>
              <p className="text-muted-foreground">
                {selectedArea ? `${selectedArea.name}, ${selectedArea.city}` : 'No area selected yet.'}
              </p>
            </div>

            <Button
              onClick={() => updateAreaMutation.mutate(selectedAreaId)}
              disabled={!selectedAreaId || updateAreaMutation.isPending}
            >
              {updateAreaMutation.isPending ? 'Saving...' : 'Save Area'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
