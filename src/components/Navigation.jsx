import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Settings, Target, Crosshair, Map, LayoutDashboard, BookOpen, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isActive = (path) => location.pathname === path;

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/target-shooting', label: 'Target', icon: Crosshair },
    { path: '/clay-shooting', label: 'Clay', icon: Target },
    { path: '/deer-management', label: 'Deer', icon: null, emoji: '🦌' },
    { path: '/deer-stalking', label: 'Map', icon: Map },
  ];

  const moreNavItems = [
    { path: '/records', label: 'Records', icon: BookOpen },
    { path: '/users', label: 'Users', icon: User },
  ];

  return (
    <>
      {/* Top Nav (desktop) */}
      <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            🎯 Shooting Records
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 items-center">
            {[...mainNavItems, ...moreNavItems].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                    isActive(item.path)
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.emoji && <span>{item.emoji}</span>}
                  {item.label}
                </Link>
              );
            })}
            {user?.role === 'admin' && (
              <Link
                to="/admin/users"
                className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                  isActive('/admin/users') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            )}
            <Link
              to="/profile"
              className={`text-sm font-medium transition-colors ${
                isActive('/profile') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Profile
            </Link>
          </div>

          {/* Mobile: hamburger for extras */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 hover:bg-secondary rounded-lg"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown extra menu */}
        {open && (
          <div className="md:hidden bg-card border-t border-border px-4 pb-4 pt-2 space-y-1">
            {moreNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path) ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              );
            })}
            {user?.role === 'admin' && (
              <Link
                to="/admin/users"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin/users') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            )}
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/profile') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
              }`}
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
        <div className="flex justify-center px-4">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 max-w-[80px] flex flex-col items-center justify-center py-4 gap-1 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {Icon && <Icon className={`w-6 h-6 ${active ? 'text-primary' : ''}`} />}
                {item.emoji && <span className="text-xl leading-none">{item.emoji}</span>}
                <span className="text-[11px] font-medium leading-tight text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding spacer for mobile so content isn't hidden behind bottom nav */}
      <div className="md:hidden" style={{ height: 'calc(80px + env(safe-area-inset-bottom, 16px))' }} />
    </>
  );
}