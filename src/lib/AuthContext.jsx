import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { cacheUserProfile, getCachedUserProfile } from '@/lib/syncEngine';
import { preCacheUserData } from '@/lib/offlineSupport';
import { offlineDB, ENTITY_STORE_MAP } from '@/lib/offlineDB';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);

      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.

      try {
        // Direct use of base44 SDK instead of custom axios client
        if (appParams.token) {
          // User has token, check their auth status
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthError(null);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        setIsLoadingPublicSettings(false);

        // Handle errors gracefully
        const cached = await getCachedUserProfile().catch(() => null);
        if (cached && appParams.token) {
          setUser({ ...cached, profileComplete: true });
          setIsAuthenticated(true);
          setAuthError(null);
        } else {
          setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error in checkAppState:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null); // Clear any previous auth errors on success
      setIsLoadingAuth(false);
      // Cache user profile and pre-cache all entity data for offline access
      cacheUserProfile(currentUser).catch(() => {});
      preCacheUserData(currentUser.email).catch(() => {});
    } catch (error) {
      console.error('User auth check failed:', error);

      // Try to restore from local cache if network error (not auth error)
      const isNetworkError = !error.status || error.status === 0;
      if (isNetworkError) {
        const cached = await getCachedUserProfile().catch(() => null);
        if (cached) {
          setUser({ ...cached, profileComplete: true });
          setIsAuthenticated(true);
          setAuthError(null);
          setIsLoadingAuth(false);
          return;
        }
      }

      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setUser(null);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = async (shouldRedirect = true) => {
    try {
      // SECURITY FIX: Clear all user-specific offline data before logout
      const userStores = [
        'user_profile',
        'sessions',
        'rifles',
        'shotguns',
        'clubs',
        'locations',
        'ammunition',
        'areas',
        'map_markers',
        'harvests',
        'deer_outings',
        'reloading_sessions',
        'reloading_components',
        'reloading_stock',
        'reloading_inventory',
        'cleaning_history',
        'ammo_spending',
        'sync_queue',
      ];
      
      for (const store of userStores) {
        try {
          await offlineDB.clearStore(store);
        } catch (err) {
          console.warn(`Could not clear offline store '${store}':`, err);
        }
      }
      
      console.log('✅ Offline cache cleared on logout');
    } catch (err) {
      console.error('Error clearing offline cache on logout:', err);
    }
    
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  const refreshUser = async () => {
    try {
      // Force fresh fetch by invalidating SDK cache
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // Update cache with fresh data
      cacheUserProfile(currentUser).catch(() => {});
      return currentUser;
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  };

  const invalidateUserCache = () => {
    // Force a fresh fetch on next auth check (for when admin changes user role)
    localStorage.removeItem('cachedUserProfile');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser,
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      refreshUser,
      invalidateUserCache
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};