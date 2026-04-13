import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Settings, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [profileOpen]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/target-shooting', label: 'Target Shooting' },
    { path: '/clay-shooting', label: 'Clay Shooting' },
    { path: '/deer-management', label: 'Deer Management' },
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
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                isActive('/profile') || isActive('/reports')
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Profile
              <ChevronDown className={`w-4 h-4 transition-transform ${
                profileOpen ? 'rotate-180' : ''
              }`} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-lg shadow-lg z-50">
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className={`block px-4 py-2 text-sm font-medium rounded-lg ${
                    isActive('/profile')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  Profile
                </Link>
              </div>
            )}
          </div>
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