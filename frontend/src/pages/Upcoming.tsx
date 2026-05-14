import { useQuery } from '@tanstack/react-query';
import { outagesService } from '@/services/outages.service';
import { Layout } from '@/components/Layout';
import { OutageCard } from '@/components/OutageCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock3, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Upcoming() {
  const { data: upcomingOutages, isLoading, refetch } = useQuery({
    queryKey: ['outages', 'upcoming'],
    queryFn: outagesService.getUpcomingOutages,
  });

  const handleRefresh = async () => {
    await refetch();
    toast.success('Upcoming routine refreshed');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <section className="utility-panel-strong p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="status-chip border-primary/40 bg-primary/10 text-primary">
                <Calendar className="h-3.5 w-3.5" />
                Upcoming schedule
              </div>
              <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold sm:text-4xl">
                Upcoming routine windows
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Check the remaining outage windows from now onward, including the next day, so it&apos;s easier to plan
                ahead.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="border border-border bg-secondary/55 px-4 py-3">
                <p className="data-label">Upcoming Windows</p>
                <p className="mt-1 text-lg font-semibold">{upcomingOutages?.length || 0}</p>
              </div>
              <Button onClick={handleRefresh} variant="outline" className="border-border bg-secondary">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="utility-panel">
                <CardContent className="p-5">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : upcomingOutages && upcomingOutages.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingOutages.map((outage) => (
              <OutageCard key={outage._id} outage={outage} />
            ))}
          </div>
        ) : (
          <Card className="utility-panel">
            <CardContent className="p-8 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No upcoming outages</h3>
              <p className="text-muted-foreground">
                No remaining routine outages were found for today or tomorrow.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                Refresh later to check the next computed routine window.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
