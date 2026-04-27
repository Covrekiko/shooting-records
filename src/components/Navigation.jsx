import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Settings, Target, Crosshair, Map,
  BookOpen, User, ArrowLeft, BarChart3,
  Shield, Layers, RefreshCw, Sun, FlaskConical, ScanLine,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
};

const NAV_SECTIONS = [
  {
    label: 'Sessions',
    items: [
      { path: '/target-shooting', label: 'Target Shooting', icon: Crosshair, module: 'target_shooting' },
      { path: '/clay-shooting', label: 'Clay Shooting', icon: Target, module: 'clay_shooting' },
      { path: '/deer-management', label: 'Deer Management', icon: Layers, module: 'deer_management' },
      { path: '/scope-click-card', label: 'Scope Click Cards', icon: ScanLine, module: 'target_shooting' },
    ],
  },
  {
    label: 'Field',
    items: [
      { path: '/deer-stalking', label: 'Stalking Map', icon: Map, module: 'stalk_map' },
      { path: '/deer-stalking-logs', label: 'Stalking Logs', icon: BookOpen, module: 'stalk_map' },
      { path: '/sunrise-sunset', label: 'Shooting Hours', icon: Sun },
    ],
  },
  {
    label: 'Armory',
    items: [
      { path: '/ammo-summary', label: 'Armory Status', icon: Shield },
      { path: '/reloading', label: 'Reloading', icon: RefreshCw, module: 'reloading' },
      { path: '/load-development', label: 'Load Development', icon: FlaskConical, module: 'reloading' },
    ],
  },
  {
    label: 'Data',
    items: [
      { path: '/records', label: 'Records', icon: BookOpen },
      { path: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
];

const DESKTOP_ITEMS = [
  { path: '/target-shooting', label: 'Target', icon: Crosshair, module: 'target_shooting' },
  { path: '/clay-shooting', label: 'Clay', icon: Target, module: 'clay_shooting' },
  { path: '/deer-management', label: 'Deer', icon: Layers, module: 'deer_management' },
  { path: '/deer-stalking', label: 'Map', icon: Map, module: 'stalk_map' },
  { path: '/ammo-summary', label: 'Armory', icon: Shield },
  { path: '/records', label: 'Records', icon: BookOpen },
  { path: '/reloading', label: 'Reloading', icon: RefreshCw, module: 'reloading' },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, hasPending, isSyncing } = useOffline();
  const { isEnabled } = useModules();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const isDashboard = location.pathname === '/';
  const pageTitle = PAGE_TITLES[location.pathname] || '';
  const isActive = (path) => location.pathname === path;

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      const tab = getTabForPath(location.pathname);
      navigate(tab ? TAB_DEFAULT[tab] : '/');
    }
  };

  return (
    <>
      {/* ── DESKTOP NAV ─────────────────────────────────────────────── */}
      <div className="hidden md:block sticky top-0 z-[9000] bg-slate-50 dark:bg-[#0f1117]">
        <div className="max-w-7xl mx-auto px-4 pt-3 pb-2">
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 px-5 py-3 flex items-center justify-between">
            <Link to="/" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <img src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/817907075_image.png" alt="logo" className="w-8 h-8 rounded-xl object-cover" />
              <span className="tracking-tight">Shooting Records</span>
              {/* Connectivity dot */}
              <span
                title={!isOnline ? 'Offline' : isSyncing ? 'Syncing…' : hasPending ? 'Changes pending' : 'Online'}
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  !isOnline ? 'bg-slate-400' : isSyncing ? 'bg-blue-400 animate-pulse' : hasPending ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
            </Link>
            <div className="flex gap-0.5 items-center">
              {DESKTOP_ITEMS.filter(item => !item.module || isEnabled(item.module)).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-100 ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/80'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
              {user?.role === 'admin' && (
                <Link to="/admin/users"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-100 ${
                    isActive('/admin/users')
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/80'
                  }`}>
                  <Settings className="w-3.5 h-3.5" />Admin
                </Link>
              )}
              <Link to="/profile"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-100 ${
                  isActive('/profile')
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/80'
                }`}>
                <User className="w-3.5 h-3.5" />Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE TOP BAR ──────────────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-[9000] bg-slate-50 dark:bg-[#0f1117]">
        <div className="mx-3 mt-2 mb-1.5 bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 px-4 py-2.5 flex items-center justify-between">
          {isDashboard ? (
            <Link to="/" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <img src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/817907075_image.png" alt="logo" className="w-7 h-7 rounded-lg object-cover" />
              <span className="tracking-tight">Shooting Records</span>
              <span
                title={!isOnline ? 'Offline' : isSyncing ? 'Syncing…' : hasPending ? 'Changes pending' : 'Online'}
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  !isOnline ? 'bg-slate-400' : isSyncing ? 'bg-blue-400 animate-pulse' : hasPending ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
            </Link>
          ) : (
            <motion.button
              onClick={handleBack}
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-1.5 text-slate-900 dark:text-white"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold">{pageTitle || 'Back'}</span>
            </motion.button>
          )}

          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center active:scale-90 transition-transform"
          >
            {open ? <X className="w-4.5 h-4.5 text-slate-700 dark:text-white" /> : <Menu className="w-4.5 h-4.5 text-slate-700 dark:text-white" />}
          </button>
        </div>

        {/* Mobile full-menu dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="mx-3 mb-1 bg-white dark:bg-slate-800/95 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden"
            >
              {NAV_SECTIONS.map((section) => {
                const visibleItems = section.items.filter(item => !item.module || isEnabled(item.module));
                if (visibleItems.length === 0) return null;
                return (
                <div key={section.label} className="px-2 pt-2 pb-1">
                  <p className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{section.label}</p>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 mb-0.5 ${
                          active
                            ? 'bg-slate-900 text-white dark:bg-primary dark:text-white'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                        }`}>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                      </Link>
                    );
                  })}
                </div>
                );
                })}

                {/* Profile + Admin */}
                <div className="px-2 pt-1 pb-2 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                {user?.role === 'admin' && (
                  <Link to="/admin/users" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 mb-0.5">
                    <Settings className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link to="/profile" onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive('/profile') ? 'bg-slate-900 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                  }`}>
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </>
  );
}