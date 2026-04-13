import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Settings } from 'lucide-react';
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

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/target-shooting', label: 'Target Shooting' },
    { path: '/clay-shooting', label: 'Clay Shooting' },
    { path: '/deer-management', label: 'Deer Management' },
    { path: '/settings/ammunition', label: 'Ammunition' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-primary">
          🎯 Shooting Records
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-8">
          {navItems.map((item) => {
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
                {item.label}
              </Link>
            );
          })}
          {user?.role === 'admin' && (
            <Link
              to="/admin/users"
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                isActive('/admin/users')
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="w-4 h-4" />
              Admin
            </Link>
          )}
          <Link
            to="/profile"
            className={`text-sm font-medium transition-colors ${
              isActive('/profile')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Profile
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 hover:bg-secondary rounded-lg"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mobile Navigation */}
        {open && (
          <div className="absolute top-full left-0 right-0 bg-card border-b border-border md:hidden">
            <div className="flex flex-col p-4 gap-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`text-sm font-medium py-2 px-3 rounded transition-colors flex items-center gap-1 ${
                      isActive(item.path)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-secondary'
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
                  className={`text-sm font-medium py-2 px-3 rounded transition-colors flex items-center gap-1 ${
                    isActive('/admin/users')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Link>
              )}
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className={`text-sm font-medium py-2 px-3 rounded transition-colors ${
                  isActive('/profile')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}