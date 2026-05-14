import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Crown, Bell, MapPin, Layers3, CreditCard, ShieldCheck } from 'lucide-react';

import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { premiumService } from '@/services/premium.service';
import { useAuthStore } from '@/store/authStore';

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Premium() {
  const { user, updateUser, isPremium } = useAuthStore();
  const [selectedMethod, setSelectedMethod] = useState('card_placeholder');

  const { data: catalog } = useQuery({
    queryKey: ['subscriptions', 'catalog'],
    queryFn: premiumService.getCatalog,
  });

  const { data: status } = useQuery({
    queryKey: ['subscriptions', 'status'],
    queryFn: premiumService.getStatus,
    enabled: Boolean(user),
  });

  const selectedPlan = useMemo(() => catalog?.plans?.[0], [catalog]);

  const checkoutMutation = useMutation({
    mutationFn: () =>
      premiumService.checkoutPlaceholder({
        planId: selectedPlan?.id || 'premium-monthly',
        paymentMethod: selectedMethod,
      }),
    onSuccess: (data) => {
      updateUser(data.user);
      toast.success('Premium activated successfully.');
    },
    onError: () => {
      toast.error('Failed to activate premium.');
    },
  });

  const features = [
    {
      icon: MapPin,
      title: 'Multiple watched areas',
      description: 'Monitor your main area plus extra areas for family, office, or other properties.',
    },
    {
      icon: Bell,
      title: '15-minute reminders',
      description: 'Get a browser reminder before the next scheduled outage window starts.',
    },
    {
      icon: Layers3,
      title: 'Other area monitoring',
      description: 'Search, compare, and save additional schedule areas beyond the free plan limit.',
    },
    {
      icon: ShieldCheck,
      title: 'Priority access',
      description: 'Enjoy the full premium experience with faster access to premium features as they roll out.',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <section className="utility-panel-strong p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="status-chip border-primary/40 bg-primary/10 text-primary">
                <Crown className="h-3.5 w-3.5" />
                Premium Access
              </div>
              <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                Unlock broader area coverage and timely outage reminders.
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
                Premium helps you follow more than one area, receive reminders before scheduled outages, and stay ahead
                of your routine with less effort.
              </p>
            </div>

            <div className="border border-border bg-secondary/55 p-5">
              <p className="data-label">Current access</p>
              <p className="mt-3 text-2xl font-semibold">{isPremium() ? 'Premium Enabled' : 'Free Plan'}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {status?.activePurchase
                  ? `Active purchase: ${status.activePurchase.planId || 'premium'}`
                  : 'No active premium purchase yet.'}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="utility-panel">
            <CardHeader>
              <CardTitle>Plan</CardTitle>
              <CardDescription>Choose a plan and activate premium access for your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-border bg-secondary/55 p-5">
                <p className="data-label">{selectedPlan?.name || 'Premium Monthly'}</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-5xl font-bold">
                    {selectedPlan ? formatCurrency(selectedPlan.amount, selectedPlan.currency) : 'PKR 799'}
                  </span>
                  <span className="pb-1 text-sm text-muted-foreground">/{selectedPlan?.interval || 'month'}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{selectedPlan?.description}</p>
              </div>

              <div className="space-y-3">
                <LabelledMethods
                  methods={catalog?.paymentMethods || []}
                  selectedMethod={selectedMethod}
                  onSelect={setSelectedMethod}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending || !selectedPlan}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {checkoutMutation.isPending ? 'Processing checkout...' : 'Activate premium'}
              </Button>

              <p className="text-sm text-muted-foreground">
                Your premium access is activated directly after checkout so you can start using reminders and extra area
                tracking right away.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title} className="utility-panel">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 items-center justify-center border border-border bg-secondary/55">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{feature.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function LabelledMethods({
  methods,
  selectedMethod,
  onSelect,
}: {
  methods: Array<{ id: string; label: string; provider: string }>;
  selectedMethod: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {methods.map((method) => {
        const selected = method.id === selectedMethod;
        return (
          <button
            key={method.id}
            type="button"
            className={`border p-4 text-left transition-colors ${
              selected ? 'border-primary bg-primary/10' : 'border-border bg-secondary/35'
            }`}
            onClick={() => onSelect(method.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{method.label}</p>
                <p className="text-xs text-muted-foreground">{method.provider}</p>
              </div>
              {selected && <Badge variant="outline">Selected</Badge>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
