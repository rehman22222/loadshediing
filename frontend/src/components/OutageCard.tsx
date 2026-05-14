import { Outage } from '@/services/outages.service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock3, MapPin, FileText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutageCardProps {
  outage: Outage;
}

const statusConfig: Record<
  Outage['status'],
  { color: string; pill: string; label: string; eyebrow: string }
> = {
  scheduled: {
    color: 'from-warning/90 to-amber-500/70',
    pill: 'bg-warning/15 text-warning border-warning/30',
    label: 'Scheduled',
    eyebrow: 'Coming later today',
  },
  ongoing: {
    color: 'from-destructive/90 to-rose-500/80',
    pill: 'bg-destructive/10 text-destructive border-destructive/30',
    label: 'Ongoing',
    eyebrow: 'Live right now',
  },
  completed: {
    color: 'from-success/80 to-emerald-500/70',
    pill: 'bg-success/10 text-success border-success/30',
    label: 'Completed',
    eyebrow: 'Already completed',
  },
};

const KARACHI_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Karachi',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const KARACHI_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Karachi',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function formatKarachiDateTime(value: string) {
  return KARACHI_DATE_FORMATTER.format(new Date(value)).replace(',', '');
}

function formatKarachiTime(value: string) {
  return KARACHI_TIME_FORMATTER.format(new Date(value)).toLowerCase();
}

export const OutageCard = ({ outage }: OutageCardProps) => {
  const config = statusConfig[outage.status];
  const hasEndTime = Boolean(outage.endTime);
  const compactRange = hasEndTime
    ? `${formatKarachiTime(outage.startTime)} - ${formatKarachiTime(outage.endTime as string)}`
    : `${formatKarachiTime(outage.startTime)} onward`;

  return (
    <Card className="utility-panel overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-large">
      <div className={cn('h-1.5 bg-gradient-to-r', config.color)} />
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 border border-border bg-secondary/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {config.eyebrow}
            </div>
            <h3 className="text-lg font-bold leading-snug text-foreground sm:text-xl">{outage.area}</h3>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{outage.city}</span>
            </div>
          </div>

          <Badge className={cn('w-fit border px-3 py-1 text-xs font-semibold shadow-none', config.pill)}>
            {config.label}
          </Badge>
        </div>

        <div className="mt-6 border border-border bg-secondary/55 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-card shadow-soft">
              <Clock3 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Routine Time</p>
              <p className="mt-1 text-base font-bold text-foreground sm:text-lg">{compactRange}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {formatKarachiDateTime(outage.startTime)}
                {hasEndTime ? ` - ${formatKarachiTime(outage.endTime as string)}` : ''}
                <span className="border border-border bg-card px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  PKT
                </span>
              </p>
            </div>
          </div>
        </div>

        {outage.note && (
          <div className="mt-4 flex items-start gap-3 border border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{outage.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
