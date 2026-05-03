import { useModules } from '@/context/ModulesContext';

/**
 * Wraps a page and blocks it if the required module is not enabled.
 * Usage: <ModuleGate module="reloading"><ReloadingManagement /></ModuleGate>
 */
export default function ModuleGate({ module: moduleKey, children }) {
  const { isEnabled, loading } = useModules();

  if (loading) return null;

  return children;
}