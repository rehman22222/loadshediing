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
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-warning" />
            Report Outage
          </h1>
          <p className="text-muted-foreground mt-1">
            Submit a verified outage report for your area.
            {isPremium() && <span className="ml-2 text-primary font-medium">Priority processing enabled</span>}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Outage Details</CardTitle>
            <CardDescription>
              Reports are saved to the outage database with your selected area and current device location when available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location">Area or Location</Label>
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
                  placeholder="Describe the outage and any useful context..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={5}
                />
              </div>

              <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-1">
                <p className="font-medium">What gets submitted</p>
                <p className="text-muted-foreground">
                  Area: {formData.location || 'Not provided yet'}
                </p>
                <p className="text-muted-foreground">
                  Device coordinates: {user?.location ? 'Included' : 'Not available'}
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={reportMutation.isPending}>
                {reportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
