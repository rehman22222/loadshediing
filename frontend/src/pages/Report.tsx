import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { outagesService } from '@/services/outages.service';
import { useAuthStore } from '@/store/authStore';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';

export default function Report() {
  const { user, isPremium } = useAuthStore();
  const [formData, setFormData] = useState({
    location: user?.area?.name || '',
    description: '',
  });

  const reportMutation = useMutation({
    mutationFn: outagesService.reportOutage,
    onSuccess: () => {
      toast.success(isPremium() ? 'Priority report submitted successfully.' : 'Report submitted successfully.');
      setFormData({
        location: user?.area?.name || '',
        description: '',
      });
    },
    onError: (error: unknown) => {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(message || 'Failed to submit report');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reportMutation.mutate({
      ...formData,
      coordinates: user?.location,
    });
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="utility-panel-strong p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="status-chip border-warning/40 bg-warning/10 text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                Community report
              </div>
              <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Report an outage in your area</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Share what you&apos;re seeing so the report can be reviewed with the right area and location details.
                {isPremium() && <span className="ml-2 text-primary font-medium">Priority handling is enabled.</span>}
              </p>
            </div>
          </div>
        </section>

        <Card className="utility-panel">
          <CardHeader>
            <CardTitle>Outage details</CardTitle>
            <CardDescription>
              Include the area name and a short description so the issue can be reviewed quickly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location">Area or location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Gulshan Block 5"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what happened, when it started, and anything useful for review..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={5}
                />
              </div>

              <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm space-y-1">
                <p className="font-medium text-foreground">What will be sent</p>
                <p className="text-muted-foreground">
                  Area: {formData.location || 'Not provided yet'}
                </p>
                <p className="text-muted-foreground">
                  Device location: {user?.location ? 'Included if available' : 'Not available on this device yet'}
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={reportMutation.isPending}>
                {reportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit report'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
