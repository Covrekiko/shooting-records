import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Target, Crosshair, Map, BookOpen, User, Settings,
  BarChart3, Shield, RefreshCw, Sun, FlaskConical, ScanLine,
  Layers, LogOut, ChevronRight, Menu, X, ArrowLeft, MessageCircle,
  Moon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { useOffline } from '@/context/OfflineContext';
import { getTabForPath, TAB_DEFAULT } from '@/context/TabHistoryContext';
import { useModules } from '@/context/ModulesContext';

const PAGE_TITLES = {
  '/target-shooting': 'Target Shooting',
  '/clay-shooting': 'Clay Shooting',
  '/deer-management': 'Deer Management',
  '/deer-stalking': 'Stalking Map',
  '/deer-stalking-logs': 'Stalking Logs',
  '/records': 'Records',
  '/reloading': 'Reloading',
  '/load-development': 'Load Development',
  '/scope-click-card': 'Scope Click Cards',
  '/reports': 'Reports',
  '/goals': 'Goals',
  '/profile': 'Profile',
  '/profile/settings': 'Settings',
  '/settings/rifles': 'Rifles',
  '/settings/shotguns': 'Shotguns',
  '/settings/clubs': 'Clubs',
  '/settings/locations': 'Locations',
  '/settings/ammunition': 'Ammunition',
  '/settings/ammunition-inventory': 'Ammo Inventory',
  '/ammo-summary': 'Armory',
  '/sunrise-sunset': 'Shooting Hours',
  '/users': 'Users',
  '/admin/users': 'Admin',
  '/beta-feedback': 'Feedback',
};

const NAV_SECTIONS = [
  {
    label: 'Modules',
    items: [
      { path: '/target-shooting', label: 'Target Shooting', icon: Crosshair, module: 'target_shooting' },
      { path: '/clay-shooting',   label: 'Clay Shooting',   icon: Target,    module: 'clay_shooting' },
      { path: '/deer-management', label: 'Deer Management', icon: Layers,    module: 'deer_management' },
      { path: '/reloading',       label: 'Reloading',       icon: RefreshCw, module: 'reloading' },
      { path: '/load-development',label: 'Load Development',icon: FlaskConical, module: 'reloading' },
      { path: '/scope-click-card',label: 'Scope Cards',     icon: ScanLine,  module: 'target_shooting' },
    ],
  },
  {
    label: 'Field',
    items: [
      { path: '/deer-stalking',      label: 'Stalking Map',  icon: Map, module: 'stalk_map' },
      { path: '/deer-stalking-logs', label: 'Stalking Logs', icon: BookOpen, module: 'stalk_map' },
      { path: '/sunrise-sunset',     label: 'Shooting Hours',icon: Sun },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/ammo-summary', label: 'Armory',   icon: Shield },
      { path: '/records',      label: 'Records',  icon: BookOpen },
      { path: '/reports',      label: 'Reports',  icon: BarChart3 },
    ],
  },
];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, hasPending, isSyncing } = useOffline();
  const { isEnabled } = useModules();

  useEffect(() => {
    let mounted = true;
    base44.auth.me().then(u => { if (mounted) setUser(u); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isDashboard = location.pathname === '/';
  const pageTitle = PAGE_TITLES[location.pathname] || '';
  const isActive = (path) => location.pathname === path;

  const handleBack = () => {
    if (window.history.length > 2) navigate(-1);
    else {
      const tab = getTabForPath(location.pathname);
      navigate(tab ? TAB_DEFAULT[tab] : '/');
    }
  };

  const handleLogout = () => base44.auth.logout('/');

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('shooting-records-dark-mode');
    return saved === null ? true : saved === 'true';
  });

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('shooting-records-dark-mode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  const connectivityColor = !isOnline ? 'bg-slate-500'
    : isSyncing ? 'bg-blue-400 animate-pulse'
    : hasPending ? 'bg-amber-400'
    : 'bg-emerald-400';

  return (
    <>
      {/* ═══════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ═══════════════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 z-[35]"
        style={{ background: 'hsl(var(--sidebar-background))', borderRight: '1px solid hsl(var(--sidebar-border))' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <img
            src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/817907075_image.png"
            alt="logo"
            className="w-8 h-8 rounded-xl object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-tight truncate" style={{ color: 'hsl(0 0% 96%)' }}>
              Shooting Records
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connectivityColor}`} />
              <span className="text-[10px]" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
                {!isOnline ? 'Offline' : isSyncing ? 'Syncing' : hasPending ? 'Pending' : 'Online'}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard link */}
        <div className="px-3 pt-4 pb-2">
          <Link to="/" className={`sidebar-nav-item ${isActive('/') ? 'active' : ''}`}>
            <Home className="w-4 h-4 flex-shrink-0" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-4">
          {NAV_SECTIONS.map((section) => {
            const visible = section.items.filter(i => !i.module || isEnabled(i.module));
            if (!visible.length) return null;
            return (
              <div key={section.label}>
                <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {visible.map(item => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path}
                        className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Admin */}
          {user?.role === 'admin' && (
            <div>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'hsl(var(--muted-foreground))' }}>
                Admin
              </p>
              <div className="space-y-0.5">
                <Link to="/admin/users"
                  className={`sidebar-nav-item ${isActive('/admin/users') ? 'active' : ''}`}>
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span>Users</span>
                </Link>
                <Link to="/admin/beta-feedback"
                  className={`sidebar-nav-item ${isActive('/admin/beta-feedback') ? 'active' : ''}`}>
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Feedback</span>
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Bottom: Profile + Logout */}
        <div className="border-t px-3 py-3 space-y-0.5" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <Link to="/profile"
            className={`sidebar-nav-item ${isActive('/profile') ? 'active' : ''}`}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'hsl(var(--sidebar-primary))', color: 'hsl(var(--sidebar-primary-foreground))' }}>
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'hsl(0 0% 90%)' }}>
                {user?.full_name || 'Profile'}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {user?.role === 'admin' ? 'Administrator' : user?.role === 'beta_tester' ? 'Beta Tester' : 'Member'}
              </p>
            </div>
          </Link>
          {/* Dark mode toggle */}
          <button onClick={toggleDark}
            className="sidebar-nav-item w-full text-left">
            {isDark ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            <div className={`ml-auto relative w-9 h-5 rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          <button onClick={handleLogout}
            className="sidebar-nav-item w-full text-left hover:text-red-400">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════
          MOBILE TOP BAR
      ═══════════════════════════════════════════════════ */}
      <div className="md:hidden sticky top-0 z-[30] bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          {isDashboard ? (
            <div className="flex items-center gap-2.5">
              <img
                src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/817907075_image.png"
                alt="logo" className="w-7 h-7 rounded-lg object-cover"
              />
              <span className="text-sm font-bold tracking-tight">Shooting Records</span>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connectivityColor}`} />
            </div>
          ) : (
            <motion.button onClick={handleBack} whileTap={{ scale: 0.9 }}
              className="flex items-center gap-1.5 text-foreground">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{pageTitle || 'Back'}</span>
            </motion.button>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-90 transition-transform">
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mx-3 mb-2 rounded-2xl shadow-xl border border-border overflow-hidden"
              style={{ background: 'hsl(var(--card))' }}
            >
              <div className="px-2 pt-2 pb-1">
                <Link to="/" onClick={() => setMobileOpen(false)}
                  className={`sidebar-nav-item ${isActive('/') ? 'active' : ''}`}>
                  <Home className="w-4 h-4" /><span>Dashboard</span>
                </Link>
              </div>

              {NAV_SECTIONS.map((section) => {
                const visible = section.items.filter(i => !i.module || isEnabled(i.module));
                if (!visible.length) return null;
                return (
                  <div key={section.label} className="px-2 pt-1 pb-1">
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {section.label}
                    </p>
                    {visible.map(item => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                          className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}>
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}

              <div className="px-2 pt-1 pb-2 border-t border-border">
                {user?.role === 'admin' && (
                  <Link to="/admin/users" onClick={() => setMobileOpen(false)}
                    className="sidebar-nav-item">
                    <Settings className="w-4 h-4" /><span>Admin</span>
                  </Link>
                )}
                <Link to="/profile" onClick={() => setMobileOpen(false)}
                  className={`sidebar-nav-item ${isActive('/profile') ? 'active' : ''}`}>
                  <User className="w-4 h-4" /><span>Profile</span>
                </Link>
                <button onClick={handleLogout} className="sidebar-nav-item w-full text-left">
                  <LogOut className="w-4 h-4" /><span>Log Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}