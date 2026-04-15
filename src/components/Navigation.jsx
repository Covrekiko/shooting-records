import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Settings, Target, Crosshair, Map, LayoutDashboard, BookOpen, User, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

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
      {/* ── Top Nav ── */}
      {/* Desktop: standard sticky bar */}
      <nav className="hidden md:block sticky top-0 z-[9000] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/20 shadow-sm" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/817907075_image.png" alt="logo" className="w-7 h-7 rounded-lg object-cover" />
            Shooting Records
          </Link>
          <div className="flex gap-6 items-center">
            {[...mainNavItems, ...moreNavItems].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}
                  className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive(item.path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.emoji && <span>{item.emoji}</span>}
                  {item.label}
                </Link>
              );
            })}
            {user?.role === 'admin' && (
              <Link to="/admin/users" className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/admin/users') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <Settings className="w-4 h-4" />Admin
              </Link>
            )}
            <Link to="/profile" className={`text-sm font-medium transition-colors ${isActive('/profile') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Profile</Link>
          </div>
        </div>
      </nav>

      {/* Mobile: floating pill header */}
      <div className="md:hidden sticky top-0 z-[9000]" style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}>
        <div className="mx-4 mt-2 mb-1 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/817907075_image.png" alt="logo" className="w-7 h-7 rounded-lg object-cover" />
            <span>Shooting Records</span>
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center active:scale-90 transition-transform"
          >
            {open ? <X className="w-5 h-5 text-slate-700 dark:text-white" /> : <Menu className="w-5 h-5 text-slate-700 dark:text-white" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="mx-4 mt-1 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700 px-3 py-2"
            >
              {[...moreNavItems,
                ...(user?.role === 'admin' ? [{ path: '/admin/users', label: 'Admin', icon: Settings }] : []),
                { path: '/profile', label: 'Profile', icon: User }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${isActive(item.path) ? 'bg-primary/10 text-primary' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile Floating Bottom Nav ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9000]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
        <div className="mx-4 mb-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 px-2 py-2 flex justify-around">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-150"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${active ? 'bg-primary/15' : ''}`}>
                  {Icon && <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`} />}
                  {item.emoji && <span className="text-lg leading-none">{item.emoji}</span>}
                </div>
                <span className={`text-[10px] font-semibold leading-none ${active ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="md:hidden h-28" />
    </>
  );
}