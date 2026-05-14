import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Zap, Home, Calendar, AlertTriangle, Crown, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isPremium, isAdmin } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Upcoming', href: '/upcoming', icon: Calendar },
    { name: 'Report', href: '/report', icon: AlertTriangle },
    { name: 'Profile', href: '/profile', icon: Settings },
    ...(isAdmin() ? [{ name: 'Admin', href: '/admin', icon: ShieldCheck }] : []),
    ...(!isPremium() ? [{ name: 'Premium', href: '/premium', icon: Crown }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navigation.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className={cn(
            'group flex items-center gap-3 border px-4 py-3 transition-all duration-200',
            location.pathname === item.href
              ? 'border-primary bg-primary text-primary-foreground shadow-medium'
              : 'border-border bg-transparent text-muted-foreground hover:border-accent/60 hover:bg-secondary hover:text-foreground',
            mobile && 'text-base'
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="font-medium">{item.name}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="app-grid min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-3 px-3 sm:h-20 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="icon" className="border-border bg-secondary">
                  <span className="sr-only">Open menu</span>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-r border-border bg-background p-0">
                <div className="flex h-full flex-col">
                  <div className="border-b border-border p-6">
                    <Link to="/" className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center border border-primary/40 bg-primary/15">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="block text-lg font-bold">PowerTrack</span>
                        <span className="text-xs text-muted-foreground">Outage updates that are easy to follow</span>
                      </div>
                    </Link>
                  </div>
                  <nav className="flex-1 space-y-1 p-4">
                    <NavLinks mobile />
                  </nav>
                  <div className="border-t border-border p-4 sm:hidden">
                    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
                      <p className="truncate text-sm font-semibold text-foreground">{user?.username}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-border p-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/40 bg-primary/15 shadow-soft sm:h-11 sm:w-11">
                <Zap className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-base font-bold sm:text-xl">PowerTrack</span>
                <span className="hidden text-xs uppercase tracking-[0.18em] text-muted-foreground sm:block">
                  Smart outage planning
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {isPremium() && (
              <div className="hidden items-center gap-2 border border-primary/40 bg-primary/12 px-4 py-2 text-sm font-semibold text-primary shadow-soft sm:flex">
                <Crown className="h-4 w-4" />
                <span>Premium</span>
              </div>
            )}
            <div className="hidden border border-border bg-card px-3 py-2 text-right shadow-soft sm:block sm:px-4">
              <p className="max-w-[132px] truncate text-sm font-semibold sm:max-w-none sm:text-base">{user?.username}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">{user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] gap-8 px-3 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-28 lg:px-8 lg:py-8 lg:pb-8">
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="utility-panel-strong sticky top-28 overflow-hidden p-5">
            <div className="mb-6 border border-primary/30 bg-gradient-to-br from-primary/18 to-transparent p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Daily planning</p>
              <h2 className="mt-2 text-2xl font-bold">Stay ready for every scheduled outage</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Keep today&apos;s schedule, your saved areas, and reminders in one clean view.
              </p>
            </div>

            <nav className="space-y-1">
              <NavLinks />
            </nav>

            <div className="mt-6 border border-border bg-secondary/65 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Selected Account</p>
              <p className="mt-2 font-semibold text-foreground">{user?.username}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            <Button
              variant="outline"
              className="mt-4 w-full justify-start gap-3 border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto pb-1 no-scrollbar">
          {navigation.slice(0, 5).map((item) => {
            const active = location.pathname === item.href;

            return (
              <Link
                key={`bottom-${item.name}`}
                to={item.href}
                className={cn(
                  'flex min-h-[64px] min-w-[78px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-all duration-200 sm:min-w-[88px]',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-medium'
                    : 'border-border bg-card/80 text-muted-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[10px] font-semibold leading-none sm:text-[11px]">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
