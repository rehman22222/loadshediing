import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Layout } from '@/components/Layout';
import { adminService } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Users, Crown, MapPin, Bell, Database } from 'lucide-react';

function formatDate(value: string | null) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function Admin() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: adminService.getAnalytics,
  });

  const summaryCards = data
    ? [
        { label: 'Total Users', value: data.totalUsers, icon: Users },
        { label: 'Premium Users', value: data.premiumUsers, icon: Crown },
        { label: 'Areas', value: data.totalAreas, icon: MapPin },
        { label: 'Alerts Enabled', value: data.alertsEnabledUsers, icon: Bell },
      ]
    : [];

  return (
    <Layout>
      <div className="space-y-6">
        <section className="utility-panel-strong p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="status-chip border-primary/40 bg-primary/10 text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Control
              </div>
              <h1 className="mt-4 text-4xl font-bold">Operations analytics</h1>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
                Monitor import coverage, user plan mix, alert adoption, and recent platform activity from one private
                dashboard.
              </p>
            </div>

            <div className="border border-border bg-secondary/55 px-4 py-3">
              <p className="data-label">Latest Import</p>
              <p className="mt-1 text-lg font-semibold">{formatDate(data?.latestImportDate || null)}</p>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Card key={item} className="utility-panel">
                <CardContent className="p-6">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="mt-4 h-10 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.label} className="utility-panel">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="data-label">{card.label}</p>
                    <card.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-4 text-4xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="utility-panel">
            <CardHeader>
              <CardTitle>Import activity</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.importBatches || []}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="utility-panel">
            <CardHeader>
              <CardTitle>Platform health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-border bg-secondary/55 p-4">
                <p className="data-label">Imported Outages</p>
                <p className="mt-2 text-3xl font-bold">{data?.importedOutages ?? 0}</p>
              </div>
              <div className="border border-border bg-secondary/55 p-4">
                <p className="data-label">Feedback Records</p>
                <p className="mt-2 text-3xl font-bold">{data?.feedbackCount ?? 0}</p>
              </div>
              <div className="border border-border bg-secondary/55 p-4">
                <p className="data-label">Active Purchases</p>
                <p className="mt-2 text-3xl font-bold">{data?.activePurchases ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="utility-panel">
            <CardHeader>
              <CardTitle>Top outage areas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                (data?.topAreas || []).map((item) => (
                  <div key={item.area} className="flex items-center justify-between border border-border bg-secondary/55 p-4">
                    <div>
                      <p className="font-semibold">{item.area}</p>
                      <p className="text-sm text-muted-foreground">Imported schedule coverage</p>
                    </div>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="utility-panel">
            <CardHeader>
              <CardTitle>Recent subscription activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                (data?.recentPurchases || []).map((item) => (
                  <div key={item.id} className="border border-border bg-secondary/55 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{item.user}</p>
                        <p className="text-sm text-muted-foreground">{item.planId}</p>
                      </div>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.paymentMethod} · PKR {item.amount}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="utility-panel">
          <CardHeader>
            <CardTitle>Recent feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              (data?.recentFeedback || []).map((item) => (
                <div key={item.id} className="border border-border bg-secondary/55 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{item.user}</p>
                      <p className="text-sm text-muted-foreground">{item.area}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Database className="h-4 w-4" />
                      {formatDate(item.createdAt)}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{item.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
