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
      {/* Top Nav (desktop) */}
       <nav className="sticky top-0 z-50 bg-white/12 backdrop-blur-xl border-b border-white/20 shadow-sm" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
         <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
           <Link to="/" className="text-lg font-semibold text-slate-900">
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
            className="md:hidden p-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 transition-all active:scale-90"
          >
            {open ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5 text-slate-900" />}
          </button>
        </div>

        {/* Mobile dropdown extra menu - iOS glass style */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-white/15 backdrop-blur-xl border-t border-white/20 px-3 pb-3 pt-2 space-y-0.5"
              style={{ WebkitBackdropFilter: 'blur(20px)' }}
            >
              {/* Header */}
              <div className="px-3 py-2 pb-3">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Menu</p>
              </div>

              {/* Records & Users section */}
              <div className="space-y-0">
                {moreNavItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.div key={item.path} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                      <Link
                        to={item.path}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                          isActive(item.path)
                            ? 'bg-primary/20 text-primary'
                            : 'text-slate-900 hover:bg-white/20'
                        }`}
                      >
                        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="my-2 h-px bg-white/10" />

              {/* Admin & Profile section */}
              <div className="space-y-0">
                {user?.role === 'admin' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                    <Link
                      to="/admin/users"
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                        isActive('/admin/users')
                          ? 'bg-primary/20 text-primary'
                          : 'text-slate-900 hover:bg-white/20'
                      }`}
                    >
                      <Settings className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">Admin</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </motion.div>
                )}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                      isActive('/profile')
                        ? 'bg-primary/20 text-primary'
                        : 'text-slate-900 hover:bg-white/20'
                    }`}
                  >
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">Profile</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Bottom Nav - iOS glass style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/15 backdrop-blur-xl border-t border-white/20 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="flex justify-center gap-1 px-3 py-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center justify-center py-2 px-3 gap-0.5 transition-all duration-200 rounded-lg min-w-16 ${
                  active ? 'text-primary' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {Icon && <Icon className={`w-5 h-5`} />}
                {item.emoji && <span className="text-lg leading-none">{item.emoji}</span>}
                <span className="text-[9px] font-semibold leading-tight text-center">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding spacer for mobile so content isn't hidden behind bottom nav */}
      <div className="md:hidden" style={{ height: 'calc(80px + env(safe-area-inset-bottom, 16px))' }} />
    </>
  );
}