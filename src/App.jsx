import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TargetShooting from './pages/TargetShooting';
import ClayShooting from './pages/ClayShooting';
import DeerManagement from './pages/DeerManagement';
import Records from './pages/Records';
import Rifles from './pages/settings/Rifles';
import Shotguns from './pages/settings/Shotguns';
import Clubs from './pages/settings/Clubs';
import Locations from './pages/settings/Locations';
import Reports from './pages/Reports';
import AdminUsers from './pages/admin/Users';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/target-shooting" element={<TargetShooting />} />
      <Route path="/clay-shooting" element={<ClayShooting />} />
      <Route path="/deer-management" element={<DeerManagement />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/records" element={<Records />} />
      <Route path="/settings/rifles" element={<Rifles />} />
      <Route path="/settings/shotguns" element={<Shotguns />} />
      <Route path="/settings/clubs" element={<Clubs />} />
      <Route path="/settings/locations" element={<Locations />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App