import { useQuery } from '@tanstack/react-query';
import { outagesService } from '@/services/outages.service';
import { Layout } from '@/components/Layout';
import { OutageCard } from '@/components/OutageCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Zap } from 'lucide-react';

export default function Upcoming() {
  const { data: upcomingOutages, isLoading } = useQuery({
    queryKey: ['outages', 'upcoming'],
    queryFn: outagesService.getUpcomingOutages,
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            Upcoming Outages
          </h1>
          <p className="text-muted-foreground mt-1">
            Scheduled power outages for the next 7 days
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
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
          <Card>
            <CardContent className="p-8 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No upcoming outages</h3>
              <p className="text-muted-foreground">
                No scheduled power outages found for the next 7 days.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
