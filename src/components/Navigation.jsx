import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Settings, Target, Crosshair, Map,
  BookOpen, User, ArrowLeft, BarChart3,
  Shield, Layers, RefreshCw, Sun, FlaskConical, ScanLine,
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
  '/profile/modules': 'App Modules',
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

  const connDot = !isOnline
    ? 'bg-[#A8ADA7]'
    : isSyncing
    ? 'bg-blue-400 animate-pulse'
    : hasPending
    ? 'bg-[#D99A32]'
    : 'bg-[#4CAF50]';

  return (
    <>
      {/* ── DESKTOP NAV ─────────────────────────────────────────────── */}
      <div className="hidden md:block sticky top-0 z-[9000]" style={{ background: '#0B0F0E' }}>
        <div className="max-w-7xl mx-auto px-4 pt-3 pb-2">
          <div
            className="rounded-2xl px-5 py-3 flex items-center justify-between"
            style={{
              background: '#151A18',
              border: '1px solid #2E3732',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            <Link to="/" className="text-sm font-bold flex items-center gap-2.5" style={{ color: '#F2F2EF' }}>
              <img src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/817907075_image.png" alt="logo" className="w-8 h-8 rounded-xl object-cover" />
              <span className="tracking-tight">Shooting Guard</span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connDot}`} />
            </Link>
            <div className="flex gap-0.5 items-center">
              {DESKTOP_ITEMS.filter(item => !item.module || isEnabled(item.module)).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{
                      background: active ? '#C79A45' : 'transparent',
                      color: active ? '#0B0F0E' : '#A8ADA7',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#F2F2EF'; e.currentTarget.style.background = '#1E2421'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#A8ADA7'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
              {user?.role === 'admin' && (
                <Link to="/admin/users"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ color: '#A8ADA7' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#F2F2EF'; e.currentTarget.style.background = '#1E2421'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#A8ADA7'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <Settings className="w-3.5 h-3.5" />Admin
                </Link>
              )}
              <Link to="/profile"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={isActive('/profile') ? { background: '#C79A45', color: '#0B0F0E' } : { color: '#A8ADA7' }}
                onMouseEnter={e => { if (!isActive('/profile')) { e.currentTarget.style.color = '#F2F2EF'; e.currentTarget.style.background = '#1E2421'; } }}
                onMouseLeave={e => { if (!isActive('/profile')) { e.currentTarget.style.color = '#A8ADA7'; e.currentTarget.style.background = 'transparent'; } }}
              >
                <User className="w-3.5 h-3.5" />Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE TOP BAR ──────────────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-[9000]" style={{ background: '#0B0F0E' }}>
        <div
          className="mx-3 mt-2 mb-1.5 rounded-2xl px-4 py-2.5 flex items-center justify-between"
          style={{
            background: '#151A18',
            border: '1px solid #2E3732',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {isDashboard ? (
            <Link to="/" className="text-sm font-bold flex items-center gap-2" style={{ color: '#F2F2EF' }}>
              <img src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/817907075_image.png" alt="logo" className="w-7 h-7 rounded-lg object-cover" />
              <span className="tracking-tight">Shooting Guard</span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connDot}`} />
            </Link>
          ) : (
            <motion.button
              onClick={handleBack}
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-1.5"
              style={{ color: '#F2F2EF' }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: '#C79A45' }} />
              <span className="text-sm font-semibold">{pageTitle || 'Back'}</span>
            </motion.button>
          )}

          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#1E2421', border: '1px solid #2E3732' }}
          >
            {open
              ? <X className="w-4 h-4" style={{ color: '#C79A45' }} />
              : <Menu className="w-4 h-4" style={{ color: '#A8ADA7' }} />
            }
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
              className="mx-3 mb-1 rounded-2xl overflow-hidden"
              style={{
                background: '#151A18',
                border: '1px solid #2E3732',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            >
              {NAV_SECTIONS.map((section) => {
                const visibleItems = section.items.filter(item => !item.module || isEnabled(item.module));
                if (visibleItems.length === 0) return null;
                return (
                  <div key={section.label} className="px-2 pt-2 pb-1">
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C79A45' }}>
                      {section.label}
                    </p>
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 mb-0.5"
                          style={{
                            background: active ? '#C79A45' : 'transparent',
                            color: active ? '#0B0F0E' : '#F2F2EF',
                          }}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#0B0F0E' : '#C79A45' }} />
                          <span className="flex-1">{item.label}</span>
                          {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#0B0F0E' }} />}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}

              {/* Profile + Admin */}
              <div className="px-2 pt-1 pb-2 mt-1" style={{ borderTop: '1px solid #2E3732' }}>
                {user?.role === 'admin' && (
                  <Link to="/admin/users" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5"
                    style={{ color: '#F2F2EF' }}
                  >
                    <Settings className="w-4 h-4" style={{ color: '#C79A45' }} />
                    <span>Admin</span>
                  </Link>
                )}
                <Link to="/profile" onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={isActive('/profile') ? { background: '#C79A45', color: '#0B0F0E' } : { color: '#F2F2EF' }}
                >
                  <User className="w-4 h-4" style={{ color: isActive('/profile') ? '#0B0F0E' : '#C79A45' }} />
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