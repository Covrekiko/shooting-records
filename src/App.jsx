import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from './lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { OutingProvider } from '@/context/OutingContext';
import { OfflineProvider } from '@/context/OfflineContext';
import { ModulesProvider } from '@/context/ModulesContext';
import { ThemeProvider } from '@/context/ThemeContext';
import ModuleGate from '@/components/ModuleGate';
import OfflineStatusBar from '@/components/OfflineStatusBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { TabHistoryProvider } from '@/context/TabHistoryContext';
import MobileTabBar from '@/components/MobileTabBar';
import ProfileSetup from './pages/ProfileSetup';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const TargetShooting = lazy(() => import('./pages/TargetShooting'));
const ClayShooting = lazy(() => import('./pages/ClayShooting'));
const DeerManagement = lazy(() => import('./pages/DeerManagement'));
const Records = lazy(() => import('./pages/Records'));
const Goals = lazy(() => import('./pages/Goals'));
const Rifles = lazy(() => import('./pages/settings/Rifles'));
const Shotguns = lazy(() => import('./pages/settings/Shotguns'));
const Clubs = lazy(() => import('./pages/settings/Clubs'));
const Locations = lazy(() => import('./pages/settings/Locations'));
const Ammunition = lazy(() => import('./pages/settings/Ammunition'));
const AmmunitionInventory = lazy(() => import('./pages/settings/AmmunitionInventory'));
const Reports = lazy(() => import('./pages/Reports'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const ReloadingManagement = lazy(() => import('./pages/ReloadingManagement'));
const DeerStalkingMap = lazy(() => import('./pages/DeerStalkingMap'));
const DeerStalkingLogs = lazy(() => import('./pages/DeerStalkingLogs'));
const AreaShareAccept = lazy(() => import('./pages/AreaShareAccept'));
const Users = lazy(() => import('./pages/Users'));
const SunriseSunsetTracker = lazy(() => import('./pages/SunriseSunsetTracker'));
const AmmoSummary = lazy(() => import('./pages/AmmoSummary'));
const LoadDevelopment = lazy(() => import('./pages/LoadDevelopment'));
const LoadComparison = lazy(() => import('./pages/LoadComparison'));
const ScopeClickCard = lazy(() => import('./pages/ScopeClickCard'));
const AppModules = lazy(() => import('./pages/AppModules'));
const AppTheme = lazy(() => import('./pages/AppTheme'));
const BulletReferenceDB = lazy(() => import('./pages/settings/BulletReferenceDB'));
const ScopeReferenceDB = lazy(() => import('./pages/settings/ScopeReferenceDB'));
const ReferenceDatabase = lazy(() => import('./pages/settings/ReferenceDatabase'));
const BetaFeedback = lazy(() => import('./pages/BetaFeedback'));
const BetaTesters = lazy(() => import('./pages/admin/BetaTesters'));
const BetaFeedbackAdmin = lazy(() => import('./pages/admin/BetaFeedbackAdmin'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Support = lazy(() => import('./pages/Support'));
const TargetShootingAnalyzer = lazy(() => import('./pages/TargetShootingAnalyzer'));
const QRScanner = lazy(() => import('./pages/QRScanner'));
const QRItemDetails = lazy(() => import('./pages/QRItemDetails'));


const isRouteDebugEnabled = () => {
  try {
    return window.localStorage.getItem('SR_ROUTE_DEBUG') === 'true';
  } catch {
    return false;
  }
};

const routeDebugLog = (...args) => {
  if (isRouteDebugEnabled()) console.log(...args);
};

routeDebugLog('[ROUTE_DEBUG] App.jsx loaded - redirect debug version ACTIVE');

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

function PageLoadingFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );
}

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
  const modulesLoading = false;
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
    routeDebugLog('[ROUTE_DEBUG] auth redirect decision', routeDebugState);

    if (!isLoadingPublicSettings && !isLoadingAuth && !modulesLoading && authError?.type === 'auth_required' && !loginRedirectedRef.current) {
      if (sessionStorage.getItem(authRedirectStorageKey)) return;
      routeDebugLog('[ROUTE_DEBUG] redirect requested', {
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
    routeDebugLog('[ROUTE_DEBUG] ProfileSetup shown', {
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

  // Render the main app
  return (
    <>
      <ThemeSync />
      <AnimatedRoutes>
        <div>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/target-shooting" element={<ModuleGate module="target_shooting"><TargetShooting /></ModuleGate>} />
              <Route path="/target-analyzer" element={<ModuleGate module="target_shooting"><TargetShootingAnalyzer /></ModuleGate>} />
              <Route path="/clay-shooting" element={<ModuleGate module="clay_shooting"><ClayShooting /></ModuleGate>} />
              <Route path="/deer-management" element={<ModuleGate module="deer_management"><DeerManagement /></ModuleGate>} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/settings" element={<ProfileSettings />} />
              <Route path="/profile/theme" element={<AppTheme />} />
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
              <Route path="/load-comparison" element={<ModuleGate module="reloading"><LoadComparison /></ModuleGate>} />
              <Route path="/scope-click-card" element={<ModuleGate module="target_shooting"><ScopeClickCard /></ModuleGate>} />
              <Route path="/settings/bullet-reference" element={<BulletReferenceDB />} />
              <Route path="/settings/scope-reference" element={<ScopeReferenceDB />} />
              <Route path="/settings/reference-database" element={<ReferenceDatabase />} />
              <Route path="/qr-scanner" element={<QRScanner />} />
              <Route path="/qr-item" element={<QRItemDetails />} />

              <Route path="/beta-feedback" element={<BetaFeedback />} />
              <Route path="/admin/beta-testers" element={<BetaTesters />} />
              <Route path="/admin/beta-feedback" element={<BetaFeedbackAdmin />} />

              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Suspense>
        </div>
      </AnimatedRoutes>
    </>
  );
};


function AppContent() {
  const location = useLocation();

  useEffect(() => {
    if (!navigator.onLine) return;
    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const id = idle(() => {
      Promise.allSettled([
        import('./pages/Dashboard'),
        import('./pages/DeerStalkingMap'),
        import('./pages/DeerStalkingLogs'),
        import('./pages/Records'),
        import('./pages/TargetShooting'),
        import('./pages/TargetShootingAnalyzer'),
        import('./pages/ClayShooting'),
        import('./pages/DeerManagement'),
        import('./pages/AmmoSummary'),
        import('./pages/LoadDevelopment'),
        import('./pages/LoadComparison'),
        import('./pages/ScopeClickCard'),
      ]);
    });
    return () => cancel(id);
  }, []);

  if (location.pathname === '/privacy-policy' || location.pathname === '/support') {
    return (
      <>
        <ThemeSync />
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/support" element={<Support />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </>
    );
  }

  return (
    <TabHistoryProvider>
      <OfflineStatusBar />
      <AuthenticatedApp />
      <MobileTabBar />
      <Toaster />
    </TabHistoryProvider>
  );
}

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
                    <AppContent />
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