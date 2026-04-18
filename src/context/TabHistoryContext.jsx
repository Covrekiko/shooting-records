import { createContext, useContext, useRef, useCallback } from 'react';

/**
 * Remembers the last visited path within each tab's "territory".
 * When a user taps a tab they've visited before, they return to where they left off.
 */

const TabHistoryContext = createContext(null);

// Map each tab key to the set of paths that belong to it
export const TAB_ROUTES = {
  home:     ['/'],
  sessions: ['/target-shooting', '/clay-shooting', '/deer-management'],
  field:    ['/deer-stalking', '/deer-stalking-logs', '/sunrise-sunset'],
  armory:   ['/ammo-summary', '/reloading', '/load-development', '/settings/ammunition', '/settings/ammunition-inventory'],
  records:  ['/records', '/reports', '/goals'],
  profile:  ['/profile', '/profile/settings', '/settings/rifles', '/settings/shotguns', '/settings/clubs', '/settings/locations', '/users', '/admin/users'],
};

export const TAB_DEFAULT = {
  home:     '/',
  sessions: '/target-shooting',
  field:    '/deer-stalking',
  armory:   '/ammo-summary',
  records:  '/records',
  profile:  '/profile',
};

export function getTabForPath(pathname) {
  for (const [tab, paths] of Object.entries(TAB_ROUTES)) {
    if (paths.includes(pathname)) return tab;
  }
  return null;
}

export function TabHistoryProvider({ children }) {
  // Stores last path per tab key
  const lastPaths = useRef({ ...TAB_DEFAULT });

  const setLastPath = useCallback((tab, path) => {
    lastPaths.current[tab] = path;
  }, []);

  const getLastPath = useCallback((tab) => {
    return lastPaths.current[tab] || TAB_DEFAULT[tab];
  }, []);

  return (
    <TabHistoryContext.Provider value={{ setLastPath, getLastPath }}>
      {children}
    </TabHistoryContext.Provider>
  );
}

export function useTabHistory() {
  return useContext(TabHistoryContext);
}