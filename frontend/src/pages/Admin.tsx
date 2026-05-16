import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Crown,
  Database,
  Gauge,
  MapPin,
  PieChart as PieChartIcon,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';

import { Layout } from '@/components/Layout';
import { adminService, type AdminAnalytics } from '@/services/admin.service';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(188 74% 48%)',
  'hsl(var(--destructive))',
  'hsl(266 70% 64%)',
];

function formatDate(value: string | null) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

function formatMoney(value?: number | null) {
  return `PKR ${formatNumber(value || 0)}`;
}

function formatPercent(value?: number | null) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function ratioLabel(part?: number, total?: number) {
  return `${formatNumber(part || 0)} of ${formatNumber(total || 0)}`;
}

function chartTooltipStyle() {
  return {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--foreground))',
  };
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center border border-dashed border-border bg-secondary/35 p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
  tone?: 'primary' | 'warning' | 'success' | 'destructive';
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-warning/35 bg-warning/10 text-warning'
      : tone === 'success'
        ? 'border-success/35 bg-success/10 text-success'
        : tone === 'destructive'
          ? 'border-destructive/35 bg-destructive/10 text-destructive'
          : 'border-primary/35 bg-primary/10 text-primary';

  return (
    <Card className="utility-panel">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="data-label">{label}</p>
            <p className="mt-3 text-3xl font-bold leading-none sm:text-4xl">{value}</p>
          </div>
          <div className={`border p-2 ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function QualityCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: number;
  caption: string;
  icon: typeof Gauge;
}) {
  return (
    <div className="border border-border bg-secondary/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="data-label">{label}</p>
          <p className="mt-2 text-2xl font-bold">{formatPercent(value)}</p>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <Progress value={Math.max(0, Math.min(100, value))} className="mt-4 h-2" />
      <p className="mt-3 text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <CardHeader className="pb-4">
      <CardTitle className="text-xl">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="utility-panel">
            <CardContent className="p-6">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-4 h-10 w-1/3" />
              <Skeleton className="mt-4 h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <Skeleton className="h-[360px] w-full" />
        <Skeleton className="h-[360px] w-full" />
      </div>
    </div>
  );
}

function buildActivityTrend(data?: AdminAnalytics) {
  if (!data) return [];

  const feedbackMap = new Map(data.feedbackTrend.map((item) => [item.date, item.count]));
  const purchaseMap = new Map(data.purchaseTrend.map((item) => [item.date, item.count]));

  return data.userGrowth.map((item) => ({
    date: item.date,
    users: item.count,
    feedback: feedbackMap.get(item.date) || 0,
    purchases: purchaseMap.get(item.date) || 0,
  }));
}

export default function Admin() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: adminService.getAnalytics,
  });

  const activityTrend = useMemo(() => buildActivityTrend(data), [data]);
  const operationalScore = data
    ? Math.round((data.coverageRate + data.coordinateQualityRate + data.areaSelectionRate) / 3)
    : 0;

  const summaryCards = data
    ? [
        {
          label: 'Total users',
          value: formatNumber(data.totalUsers),
          detail: `${formatPercent(data.premiumConversionRate)} premium conversion`,
          icon: Users,
          tone: 'primary' as const,
        },
        {
          label: 'Premium users',
          value: formatNumber(data.premiumUsers + data.adminUsers),
          detail: `${formatNumber(data.activePurchases)} active purchase records`,
          icon: Crown,
          tone: 'warning' as const,
        },
        {
          label: 'Schedule areas',
          value: formatNumber(data.totalAreas),
          detail: `${formatPercent(data.coverageRate)} have outage coverage`,
          icon: MapPin,
          tone: 'success' as const,
        },
        {
          label: 'Imported slots',
          value: formatNumber(data.importedOutages),
          detail: `${formatNumber(data.latestImportCount)} in latest import batch`,
          icon: Database,
          tone: 'primary' as const,
        },
      ]
    : [];

  return (
    <Layout>
      <div className="space-y-6">
        <section className="utility-panel-strong p-5 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <div>
              <div className="status-chip border-primary/40 bg-primary/10 text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Operations
              </div>
              <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">Operations analytics</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                A command view for schedule coverage, import health, adoption, feedback, and commercial activity.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="border border-border bg-secondary/55 px-4 py-3">
                <p className="data-label">Operational Score</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="text-3xl font-bold">{operationalScore}</p>
                  <Gauge className="mb-1 h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="border border-border bg-secondary/55 px-4 py-3">
                <p className="data-label">Latest Import</p>
                <p className="mt-2 text-lg font-semibold">{formatDate(data?.latestImportDate || null)}</p>
              </div>
              <div className="border border-border bg-secondary/55 px-4 py-3">
                <p className="data-label">Revenue Snapshot</p>
                <p className="mt-2 text-lg font-semibold">{formatMoney(data?.totalPurchaseVolume || 0)}</p>
              </div>
            </div>
          </div>
        </section>

        {isLoading || !data ? (
          <AdminSkeleton />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <MetricCard key={card.label} {...card} />
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
              <Card className="utility-panel">
                <SectionTitle title="Activity trend" description="New users, feedback, and purchases over the last 14 days." />
                <CardContent className="h-[340px]">
                  {activityTrend.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activityTrend} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatShortDate}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle()} labelFormatter={formatShortDate} />
                        <Line type="monotone" dataKey="users" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="feedback" stroke={CHART_COLORS[1]} strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="purchases" stroke={CHART_COLORS[2]} strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState label="No activity trend data is available yet." />
                  )}
                </CardContent>
              </Card>

              <Card className="utility-panel">
                <SectionTitle title="Quality signals" description="Core checks for data readiness and personalization." />
                <CardContent className="space-y-3">
                  <QualityCard
                    label="Area coverage"
                    value={data.coverageRate}
                    caption={ratioLabel(data.areasCoveredCount, data.totalAreas)}
                    icon={CheckCircle2}
                  />
                  <QualityCard
                    label="Coordinate quality"
                    value={data.coordinateQualityRate}
                    caption={`${formatNumber(data.missingCoordinateAreas)} areas still need coordinates`}
                    icon={MapPin}
                  />
                  <QualityCard
                    label="Area selection"
                    value={data.areaSelectionRate}
                    caption={`${formatNumber(data.usersWithArea)} users have selected an area`}
                    icon={Users}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="utility-panel xl:col-span-2">
                <SectionTitle title="Import volume" description="Recent imported outage batches by source schedule date." />
                <CardContent className="h-[320px]">
                  {data.importBatches.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.importBatches} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatShortDate}
                          stroke="hsl(var(--muted-foreground))"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle()} labelFormatter={formatShortDate} />
                        <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState label="No import batches have been recorded yet." />
                  )}
                </CardContent>
              </Card>

              <Card className="utility-panel">
                <SectionTitle title="Plan mix" description="Current account composition." />
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.planBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={54}
                          outerRadius={82}
                          paddingAngle={3}
                        >
                          {data.planBreakdown.map((entry, index) => (
                            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle()} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {data.planBreakdown.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-semibold">{formatPercent(item.percent)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="utility-panel">
                <SectionTitle title="Source mix" description="Imported schedule slots compared with manual reports." />
                <CardContent className="space-y-4">
                  {data.outageSourceBreakdown.map((item, index) => (
                    <div key={item.name} className="border border-border bg-secondary/55 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{formatNumber(item.value)} outage records</p>
                        </div>
                        <Badge variant="outline">{formatPercent(item.percent)}</Badge>
                      </div>
                      <Progress
                        value={Math.max(0, Math.min(100, item.percent))}
                        className="mt-4 h-2"
                        style={{ '--progress-color': CHART_COLORS[index % CHART_COLORS.length] } as React.CSSProperties}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="utility-panel">
                <SectionTitle title="Outage windows by hour" description="Distribution of routine start times in Karachi time." />
                <CardContent className="h-[300px]">
                  {data.outageWindowDistribution.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.outageWindowDistribution} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="hourlyOutages" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS[2]} stopOpacity={0.6} />
                            <stop offset="95%" stopColor={CHART_COLORS[2]} stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle()} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke={CHART_COLORS[2]}
                          strokeWidth={2.5}
                          fill="url(#hourlyOutages)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState label="No outage timing distribution is available yet." />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="utility-panel">
                <SectionTitle title="Top outage areas" description="Areas with the highest number of imported windows." />
                <CardContent className="space-y-3">
                  {data.topAreas.length ? (
                    data.topAreas.map((item, index) => (
                      <div key={`${item.area}-${index}`} className="border border-border bg-secondary/55 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{item.area}</p>
                            <p className="mt-1 text-sm text-muted-foreground">Schedule coverage rank #{index + 1}</p>
                          </div>
                          <Badge variant="outline">{formatNumber(item.count)}</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState label="No outage areas have been imported yet." />
                  )}
                </CardContent>
              </Card>

              <Card className="utility-panel">
                <SectionTitle title="City coverage" description="Outage records and distinct areas grouped by city." />
                <CardContent className="space-y-3">
                  {data.cityCoverage.length ? (
                    data.cityCoverage.map((item) => (
                      <div key={item.city} className="border border-border bg-secondary/55 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold">{item.city}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{formatNumber(item.areas)} distinct areas</p>
                          </div>
                          <Badge variant="outline">{formatNumber(item.outages)} slots</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState label="No city coverage data is available yet." />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="utility-panel">
              <SectionTitle title="Recent activity" description="Latest accounts, feedback, and subscription events." />
              <CardContent className="grid gap-6 xl:grid-cols-3">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">New users</h3>
                  </div>
                  <div className="space-y-3">
                    {data.recentUsers.length ? (
                      data.recentUsers.map((item) => (
                        <div key={item.id} className="border border-border bg-secondary/55 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate font-semibold">{item.user}</p>
                            <Badge variant="outline">{item.role}</Badge>
                          </div>
                          <p className="mt-1 truncate text-sm text-muted-foreground">{item.area}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyState label="No recent users." />
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <h3 className="font-semibold">Feedback</h3>
                  </div>
                  <div className="space-y-3">
                    {data.recentFeedback.length ? (
                      data.recentFeedback.map((item) => (
                        <div key={item.id} className="border border-border bg-secondary/55 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate font-semibold">{item.user}</p>
                            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                          </div>
                          <p className="mt-1 truncate text-sm text-muted-foreground">{item.area}</p>
                          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{item.message}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyState label="No recent feedback." />
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-warning" />
                    <h3 className="font-semibold">Subscriptions</h3>
                  </div>
                  <div className="space-y-3">
                    {data.recentPurchases.length ? (
                      data.recentPurchases.map((item) => (
                        <div key={item.id} className="border border-border bg-secondary/55 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate font-semibold">{item.user}</p>
                            <Badge variant="outline">{item.status}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{item.planId || 'premium'}</p>
                          <p className="mt-2 text-sm font-semibold">{formatMoney(item.amount)}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyState label="No recent purchases." />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="utility-panel">
              <SectionTitle title="Operational table" description="High-signal values for support and data maintenance." />
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Signal</TableHead>
                      <TableHead>Current value</TableHead>
                      <TableHead>Interpretation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Alerts enabled</TableCell>
                      <TableCell>{formatNumber(data.alertsEnabledUsers)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatPercent(data.alertAdoptionRate)} of users</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Location opt-in</TableCell>
                      <TableCell>{formatNumber(data.usersWithLocation)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatPercent(data.locationOptInRate)} of users</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Feedback records</TableCell>
                      <TableCell>{formatNumber(data.feedbackCount)}</TableCell>
                      <TableCell className="text-muted-foreground">Support and schedule correction queue</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Manual outage reports</TableCell>
                      <TableCell>{formatNumber(data.manualOutages)}</TableCell>
                      <TableCell className="text-muted-foreground">User or operator submitted records</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
