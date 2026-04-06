import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Zap, Home, Calendar, AlertTriangle, Crown, Settings, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isPremium } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Upcoming', href: '/upcoming', icon: Calendar },
    { name: 'Report', href: '/report', icon: AlertTriangle },
    { name: 'Profile', href: '/profile', icon: Settings },
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
            'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all',
            location.pathname === item.href
              ? 'bg-primary text-primary-foreground shadow-soft'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            mobile && 'text-base'
          )}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.name}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <span className="sr-only">Open menu</span>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b">
                    <Link to="/" className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-bold text-lg">PowerTrack</span>
                    </Link>
                  </div>
                  <nav className="flex-1 p-4 space-y-1">
                    <NavLinks mobile />
                  </nav>
                  <div className="p-4 border-t">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-medium">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl hidden sm:inline">PowerTrack</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isPremium() && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-primary text-white text-sm font-medium shadow-soft">
                <Crown className="h-4 w-4" />
                <span>Premium</span>
              </div>
            )}
            <div className="hidden sm:block text-sm">
              <p className="font-medium">{user?.username}</p>
              <p className="text-muted-foreground text-xs">{user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container flex gap-6 px-4 py-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="sticky top-20 space-y-1">
            <NavLinks />
            <div className="pt-4 mt-4 border-t space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};
