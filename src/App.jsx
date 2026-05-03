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
import { ModulesProvider, useModules } from '@/context/ModulesContext';
import { ThemeProvider } from '@/context/ThemeContext';
import ModuleOnboarding from '@/components/ModuleOnboarding';
import ModuleGate from '@/components/ModuleGate';
import OfflineStatusBar from '@/components/OfflineStatusBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { TabHistoryProvider } from '@/context/TabHistoryContext';
import MobileTabBar from '@/components/MobileTabBar';
import { useEffect, useRef } from 'react';
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
import AreaShareAccept from './pages/AreaShareAccept';
import Users from './pages/Users';
import SunriseSunsetTracker from './pages/SunriseSunsetTracker';
import AmmoSummary from './pages/AmmoSummary';
import LoadDevelopment from './pages/LoadDevelopment';
import ScopeClickCard from './pages/ScopeClickCard';
import AppModules from './pages/AppModules';
import BulletReferenceDB from './pages/settings/BulletReferenceDB';
import ScopeReferenceDB from './pages/settings/ScopeReferenceDB';
import ReferenceDatabase from './pages/settings/ReferenceDatabase';
import BetaFeedback from './pages/BetaFeedback';
import BetaTesters from './pages/admin/BetaTesters';
import BetaFeedbackAdmin from './pages/admin/BetaFeedbackAdmin';

console.log('[ROUTE_DEBUG] App.jsx loaded - redirect debug version ACTIVE');

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
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
};
const pageTransition = { duration: 0.15, ease: 'easeInOut' };

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
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, refreshUser } = useAuth();
  const { enabledModules, loading: modulesLoading, saveModules } = useModules();
  const loginRedirectedRef = useRef(false);
  const authRedirectStorageKey = `shooting_records_auth_redirect:${location.pathname}`;

  useEffect(() => {
    if (user) {
      sessionStorage.removeItem(authRedirectStorageKey);
    }
  }, [user, authRedirectStorageKey]);

  useEffect(() => {
    const routeDebugState = {
      pathname: location.pathname,
      authLoading: isLoadingAuth,
      profileLoading: false,
      publicSettingsLoading: isLoadingPublicSettings,
      modulesLoading,
      userExists: Boolean(user),
      profileExists: Boolean(user),
      profileComplete: user?.profileComplete === true,
      authErrorType: authError?.type || null,
      redirectTarget: authError?.type === 'auth_required' ? 'Base44 login' : null,
      redirectReason: authError?.type === 'auth_required' ? 'auth_required' : null,
      redirectGuardFired: loginRedirectedRef.current,
      sessionGuardFired: Boolean(sessionStorage.getItem(authRedirectStorageKey)),
    };
    console.log('[ROUTE_DEBUG] auth redirect decision', routeDebugState);

    if (!isLoadingPublicSettings && !isLoadingAuth && !modulesLoading && authError?.type === 'auth_required' && !loginRedirectedRef.current) {
      if (sessionStorage.getItem(authRedirectStorageKey)) return;
      console.log('[ROUTE_DEBUG] redirect requested', {
        from: location.pathname,
        to: 'Base44 login',
        reason: 'auth_required after loading completed',
        loadingStates: routeDebugState,
        guardRefState: loginRedirectedRef.current,
      });
      sessionStorage.setItem(authRedirectStorageKey, 'true');
      loginRedirectedRef.current = true;
      navigateToLogin('auth_required after loading completed');
    }
  }, [isLoadingPublicSettings, isLoadingAuth, modulesLoading, authError, navigateToLogin, authRedirectStorageKey, location.pathname, user]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth || modulesLoading) {
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
      return null;
    }
  }

  // Show profile setup for users who haven't completed their profile
  if (user && !user.profileComplete) {
    console.log('[ROUTE_DEBUG] ProfileSetup shown', {
      pathname: location.pathname,
      authLoading: isLoadingAuth,
      profileLoading: false,
      publicSettingsLoading: isLoadingPublicSettings,
      modulesLoading,
      userExists: Boolean(user),
      profileExists: Boolean(user),
      profileComplete: user?.profileComplete === true,
      authErrorType: authError?.type || null,
      redirectTarget: null,
      redirectReason: 'profile incomplete - rendering setup, no route redirect',
      redirectGuardFired: loginRedirectedRef.current,
    });
    return <ProfileSetup onComplete={refreshUser} />;
  }

  // Show module onboarding if modules have never been configured
  if (user && enabledModules === undefined) {
    return <ModuleOnboarding onComplete={saveModules} />;
  }

  // Render the main app
  return (
    <>
      <ThemeSync />
      <AnimatedRoutes>
        <div>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/target-shooting" element={<ModuleGate module="target_shooting"><TargetShooting /></ModuleGate>} />
            <Route path="/clay-shooting" element={<ModuleGate module="clay_shooting"><ClayShooting /></ModuleGate>} />
            <Route path="/deer-management" element={<ModuleGate module="deer_management"><DeerManagement /></ModuleGate>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/settings" element={<Profile />} />
            <Route path="/profile/theme" element={<Profile />} />
            <Route path="/profile/modules" element={<AppModules />} />
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
            <Route path="/deer-stalking" element={<ModuleGate module="stalk_map"><DeerStalkingMap /></ModuleGate>} />
            <Route path="/deer-stalking-logs" element={<ModuleGate module="stalk_map"><DeerStalkingLogs /></ModuleGate>} />
            <Route path="/area-share" element={<ModuleGate module="stalk_map"><AreaShareAccept /></ModuleGate>} />
            <Route path="/sunrise-sunset" element={<SunriseSunsetTracker />} />
            <Route path="/ammo-summary" element={<AmmoSummary />} />
            <Route path="/reloading" element={<ModuleGate module="reloading"><ReloadingManagement /></ModuleGate>} />
            <Route path="/load-development" element={<ModuleGate module="reloading"><LoadDevelopment /></ModuleGate>} />
            <Route path="/scope-click-card" element={<ModuleGate module="target_shooting"><ScopeClickCard /></ModuleGate>} />
            <Route path="/settings/bullet-reference" element={<BulletReferenceDB />} />
            <Route path="/settings/scope-reference" element={<ScopeReferenceDB />} />
            <Route path="/settings/reference-database" element={<ReferenceDatabase />} />
            <Route path="/beta-feedback" element={<BetaFeedback />} />
            <Route path="/admin/beta-testers" element={<BetaTesters />} />
            <Route path="/admin/beta-feedback" element={<BetaFeedbackAdmin />} />

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
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <OfflineProvider>
              <ModulesProvider>
                <OutingProvider>
                  <Router>
                    <TabHistoryProvider>
                      <OfflineStatusBar />
                      <AuthenticatedApp />
                      <MobileTabBar />
                      <Toaster />
                    </TabHistoryProvider>
                  </Router>
                </OutingProvider>
              </ModulesProvider>
            </OfflineProvider>
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App