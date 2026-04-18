import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { OutingProvider } from '@/context/OutingContext';
import { OfflineProvider } from '@/context/OfflineContext';
import OfflineStatusBar from '@/components/OfflineStatusBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { TabHistoryProvider } from '@/context/TabHistoryContext';
import { useEffect } from 'react';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TargetShooting from './pages/TargetShooting';
import ClayShooting from './pages/ClayShooting';
import DeerManagement from './pages/DeerManagement';
import Records from './pages/Records';
import Goals from './pages/Goals';

import Rifles from './pages/settings/Rifles';
import Shotguns from './pages/settings/Shotguns';
import Clubs from './pages/settings/Clubs';
import Locations from './pages/settings/Locations';
import Ammunition from './pages/settings/Ammunition';
import AmmunitionInventory from './pages/settings/AmmunitionInventory';
import Reports from './pages/Reports';
import AdminUsers from './pages/admin/Users';
import ReloadingManagement from './pages/ReloadingManagement';
import DeerStalkingMap from './pages/DeerStalkingMap';
import DeerStalkingLogs from './pages/DeerStalkingLogs';
import Users from './pages/Users';
import SunriseSunsetTracker from './pages/SunriseSunsetTracker';
import AmmoSummary from './pages/AmmoSummary';
import LoadDevelopment from './pages/LoadDevelopment';

// Sync dark mode with system preference
function ThemeSync() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (dark) => {
      document.documentElement.classList.toggle('dark', dark);
    };
    apply(mq.matches);
    mq.addEventListener('change', (e) => apply(e.matches));
    return () => mq.removeEventListener('change', () => {});
  }, []);
  return null;
}

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -20 },
};
const pageTransition = { duration: 0.18, ease: 'easeInOut' };

function AnimatedRoutes({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, refreshUser } = useAuth();

  <ThemeSync />

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Show profile setup for users who haven't completed their profile
  if (user && !user.profileComplete) {
    return <ProfileSetup onComplete={refreshUser} />;
  }

  // Render the main app
  return (
    <>
      <ThemeSync />
      <AnimatedRoutes>
        <div>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/target-shooting" element={<TargetShooting />} />
            <Route path="/clay-shooting" element={<ClayShooting />} />
            <Route path="/deer-management" element={<DeerManagement />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/settings" element={<Profile />} />
            <Route path="/records" element={<Records />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/settings/rifles" element={<Rifles />} />
            <Route path="/settings/shotguns" element={<Shotguns />} />
            <Route path="/settings/clubs" element={<Clubs />} />
            <Route path="/settings/locations" element={<Locations />} />
            <Route path="/settings/ammunition" element={<Ammunition />} />
            <Route path="/settings/ammunition-inventory" element={<AmmunitionInventory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/users" element={<Users />} />
            <Route path="/deer-stalking" element={<DeerStalkingMap />} />
            <Route path="/deer-stalking-logs" element={<DeerStalkingLogs />} />
            <Route path="/sunrise-sunset" element={<SunriseSunsetTracker />} />
            <Route path="/ammo-summary" element={<AmmoSummary />} />
            <Route path="/reloading" element={<ReloadingManagement />} />
            <Route path="/load-development" element={<LoadDevelopment />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </div>
      </AnimatedRoutes>
    </>
  );
};


function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <OfflineProvider>
            <OutingProvider>
              <Router>
                <TabHistoryProvider>
                  <OfflineStatusBar />
                  <AuthenticatedApp />
                  <Toaster />
                </TabHistoryProvider>
              </Router>
            </OutingProvider>
          </OfflineProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App