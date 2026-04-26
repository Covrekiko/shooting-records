import { Link } from 'react-router-dom';
import { useModules } from '@/context/ModulesContext';
import Navigation from '@/components/Navigation';

/**
 * Wraps a page and blocks it if the required module is not enabled.
 * Usage: <ModuleGate module="reloading"><ReloadingManagement /></ModuleGate>
 */
export default function ModuleGate({ module: moduleKey, children }) {
  const { isEnabled, loading } = useModules();

  if (loading) return null;

  if (!isEnabled(moduleKey)) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <Navigation />
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Feature Not Enabled</h2>
          <p className="text-muted-foreground text-sm max-w-xs mb-6">
            This feature is not enabled. You can enable it in Settings → App Modules.
          </p>
          <Link
            to="/profile/modules"
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go to App Modules
          </Link>
        </div>
      </div>
    );
  }

  return children;
}