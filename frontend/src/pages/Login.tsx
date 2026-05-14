import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BellRing, Loader2, MapPin, ShieldCheck, Zap } from 'lucide-react';

import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success('Welcome back!');
      navigate('/');
    },
    onError: (error: unknown) => {
      console.error('Login request failed:', error);
      toast.error(getApiErrorMessage(error, 'Login failed'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-accent/5 p-4 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] xl:gap-12">
        <section className="hidden md:block">
          <div className="max-w-xl">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-primary shadow-large sm:h-16 sm:w-16">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-8 text-4xl font-bold leading-tight lg:text-5xl">
              PowerTrack keeps outage updates clear, calm, and easy to check.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground lg:text-lg lg:leading-8">
              Built for mobile use, with quick schedule checks, nearby area support, and reminders that help you plan
              ahead.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="utility-panel p-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold">Reliable routine view</p>
              </div>
              <div className="utility-panel p-4">
                <BellRing className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold">Reminder support</p>
              </div>
              <div className="utility-panel p-4">
                <MapPin className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold">Nearby area suggestions</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full max-w-md justify-self-center animate-fade-in md:max-w-lg lg:max-w-md">
          <div className="mb-8 text-center md:hidden">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-large">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-3xl font-bold">PowerTrack</h1>
            <p className="mt-2 text-muted-foreground">Simple outage planning for everyday use</p>
          </div>

          <Card className="utility-panel-strong border-border shadow-large">
            <CardHeader className="space-y-2 p-6 sm:p-8">
              <CardTitle className="text-2xl sm:text-3xl">Welcome back</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Sign in to check your saved schedule, reminders, and area updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="mt-2 h-11 w-full bg-gradient-primary text-base hover:opacity-90"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link to="/register" className="font-medium text-primary hover:underline">
                    Sign up
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
