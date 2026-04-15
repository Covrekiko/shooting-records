import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Settings, Target, Crosshair, Map, LayoutDashboard, BookOpen, User, ChevronRight, ArrowLeft, Home } from 'lucide-react';
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
  const isDashboard = location.pathname === '/';

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/target-shooting', label: 'Target', icon: Crosshair },
    { path: '/clay-shooting', label: 'Clay', icon: Target },
    { path: '/deer-management', label: 'Deer', icon: null, emoji: '🦌' },
    { path: '/deer-stalking', label: 'Map', icon: Map },
  ];

  const moreNavItems = [
    { path: '/records', label: 'Records', icon: BookOpen },
  ];

  return (
    <>
      {/* ── Top Nav ── */}
      {/* Desktop: floating pill nav */}
      <div className="hidden md:block sticky top-0 z-[9000] bg-slate-50 dark:bg-[#13161e]">
        <div className="max-w-7xl mx-auto px-4 pt-3 pb-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 px-5 py-3 flex items-center justify-between">
            <Link to="/" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <img src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/817907075_image.png" alt="logo" className="w-8 h-8 rounded-xl object-cover" />
              Shooting Records
            </Link>
            <div className="flex gap-1 items-center">
              {[...mainNavItems, ...moreNavItems].map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}>
                    {Icon && <Icon className="w-4 h-4" />}
                    {item.emoji && <span className="text-base leading-none">{item.emoji}</span>}
                    {item.label}
                  </Link>
                );
              })}
              {user?.role === 'admin' && (
                <Link to="/admin/users"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === '/admin/users'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}>
                  <Settings className="w-4 h-4" />Admin
                </Link>
              )}
              <Link to="/profile"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === '/profile'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}>
                <User className="w-4 h-4" />Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: floating pill header */}
      <div className="md:hidden sticky top-0 z-[9000] bg-slate-50 dark:bg-[#13161e]">
        <div className="mx-3 mt-2 mb-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between">
          {isDashboard ? (
            <Link to="/" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <img src="https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/817907075_image.png" alt="logo" className="w-7 h-7 rounded-lg object-cover" />
              <span>Shooting Records</span>
            </Link>
          ) : (
            <motion.button
              onClick={() => navigate('/')}
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-2 text-slate-900 dark:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </motion.button>
          )}
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
              className="mx-3 mb-1 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700 px-3 py-2"
            >
              {[...moreNavItems,
                ...(user?.role === 'admin' ? [{ path: '/admin/users', label: 'Admin', icon: Settings }] : []),
                { path: '/profile', label: 'Profile', icon: User }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${isActive(item.path) ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
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

      {/* ── Mobile Floating Bottom Nav (Dashboard Only) ── */}
      <AnimatePresence>
        {isDashboard && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[9000] bg-transparent"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="mx-3 mb-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/70 dark:border-slate-700 px-1 py-1.5 flex justify-around items-center">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <motion.button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    whileTap={{ scale: 0.85 }}
                    className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-colors duration-150 min-w-[52px]"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 ${active ? 'bg-slate-900 dark:bg-white' : ''}`}>
                      {Icon && <Icon className={`w-[22px] h-[22px] ${active ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`} />}
                      {item.emoji && <span className={`text-[20px] leading-none ${active ? 'opacity-100' : 'opacity-60'}`}>{item.emoji}</span>}
                    </div>
                    <span className={`text-[10px] font-semibold leading-none ${active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>{item.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom spacer — only on dashboard */}
      {isDashboard && <div className="md:hidden" style={{ height: 'calc(72px + env(safe-area-inset-bottom, 0px))' }} />}
    </>
  );
}