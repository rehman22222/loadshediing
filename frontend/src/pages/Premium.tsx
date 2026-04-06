import { useAuthStore } from '@/store/authStore';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Bell, MapPin, BarChart3, Clock, Shield, Zap } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Premium() {
  const { isPremium } = useAuthStore();

  if (isPremium()) {
    return <Navigate to="/" replace />;
  }

  const features = [
    {
      icon: Bell,
      title: 'Real-time alerts',
      description: 'Receive faster alerts when outage schedules change in your saved area.',
    },
    {
      icon: MapPin,
      title: 'Nearby outage lookup',
      description: 'Check outages near your live location using geospatial search.',
    },
    {
      icon: BarChart3,
      title: 'Priority data access',
      description: 'See richer location-aware outage information as the dataset grows.',
    },
    {
      icon: Clock,
      title: 'Faster updates',
      description: 'Reports from premium users can be prioritized for review and verification.',
    },
    {
      icon: Shield,
      title: 'Support the platform',
      description: 'Help fund PDF processing, geocoding, and ongoing schedule updates.',
    },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-primary items-center justify-center shadow-large mb-6 animate-pulse-soft">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-3">Premium Access</h1>
          <p className="text-xl text-muted-foreground">
            Unlock location-aware features built on the outage schedule backend.
          </p>
        </div>

        <Card className="shadow-large mb-8">
          <CardHeader className="text-center pb-8">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-5xl font-bold">$9.99</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <CardDescription className="text-base">
              Purchase verification exists in the backend. Payment UI can be added next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button className="w-full bg-gradient-primary hover:opacity-90 h-12 text-lg" disabled>
              <Crown className="mr-2 h-5 w-5" />
              Premium checkout coming soon
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              The subscription screen is now aligned with the current backend capabilities.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:shadow-medium transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Today&apos;s outages</span>
              <Zap className="h-5 w-5 text-success" />
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Outage reporting</span>
              <Zap className="h-5 w-5 text-success" />
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Nearby outage search</span>
              <span className="text-sm text-muted-foreground">Premium route ready</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Purchase verification</span>
              <span className="text-sm text-muted-foreground">Backend ready</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
