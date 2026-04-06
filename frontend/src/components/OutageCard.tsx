import { Outage } from '@/services/outages.service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OutageCardProps {
  outage: Outage;
}

const statusConfig: Record<Outage['status'], { color: string; label: string }> = {
  scheduled: { color: 'bg-warning text-warning-foreground', label: 'Scheduled' },
  ongoing: { color: 'bg-destructive text-destructive-foreground', label: 'Ongoing' },
  completed: { color: 'bg-success text-success-foreground', label: 'Completed' },
};

export const OutageCard = ({ outage }: OutageCardProps) => {
  const config = statusConfig[outage.status];
  const hasEndTime = Boolean(outage.endTime);

  return (
    <Card className="overflow-hidden hover:shadow-medium transition-shadow">
      <div className={cn('h-1', config.color)} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{outage.area}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{outage.city}</span>
            </div>
          </div>
          <Badge className={config.color}>{config.label}</Badge>
        </div>

        <div className="space-y-2.5 mt-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(outage.startTime), 'MMM d, HH:mm')}
              {hasEndTime ? ` - ${format(new Date(outage.endTime as string), 'HH:mm')}` : ' onward'}
            </span>
          </div>

          {outage.note && (
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{outage.note}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
