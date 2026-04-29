import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

// All possible modules
export const ALL_MODULES = [
  { key: 'target_shooting', label: 'Target Shooting', emoji: '🎯', description: 'Range sessions, target groups, scope cards' },
  { key: 'clay_shooting',   label: 'Clay Shooting',   emoji: '🟠', description: 'Clay rounds, scorecards, club visits' },
  { key: 'deer_management', label: 'Deer Management', emoji: '🦌', description: 'Deer stalking sessions & harvest logs' },
  { key: 'stalk_map',       label: 'Stalk Map',       emoji: '🗺️', description: 'GPS stalking map, areas & outings' },
  { key: 'reloading',       label: 'Reloading',       emoji: '🔧', description: 'Component inventory & reloading sessions' },
];

const ModulesContext = createContext(null);

export function ModulesProvider({ children }) {
  // null = not yet loaded, [] = loaded but none set (needs onboarding)
  const [enabledModules, setEnabledModules] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModules = async () => {
      // If no token, skip loading — auth will handle the gate
      if (!appParams.token) {
        setLoading(false);
        return;
      }
      try {
        const user = await base44.auth.me();
        if (user?.enabledModules && Array.isArray(user.enabledModules)) {
          setEnabledModules(user.enabledModules);
        } else {
          // Not yet configured — signal onboarding needed
          setEnabledModules(undefined);
        }
      } catch (err) {
        console.error('[ModulesContext] Load failed:', err.status === 429 ? '429 rate limit' : err.message);
        // Offline fallback: default to all modules so the app still works
        setEnabledModules(ALL_MODULES.map(m => m.key));
      } finally {
        setLoading(false);
      }
    };
    loadModules();
  }, []);

  const saveModules = async (modules) => {
    await base44.auth.updateMe({ enabledModules: modules });
    setEnabledModules(modules);
  };

  const isEnabled = (moduleKey) => {
    if (!enabledModules) return true; // loading state — show everything
    return enabledModules.includes(moduleKey);
  };

  return (
    <ModulesContext.Provider value={{ enabledModules, loading, isEnabled, saveModules }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error('useModules must be used within ModulesProvider');
  return ctx;
}