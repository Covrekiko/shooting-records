import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { cacheUserProfile, getCachedUserProfile } from '@/lib/syncEngine';
import { preCacheUserData } from '@/lib/offlineSupport';
import { offlineDB, ENTITY_STORE_MAP } from '@/lib/offlineDB';

const AuthContext = createContext();
const AUTH_RETRY_COOLDOWN_MS = 60000;
let lastAuthFailureAt = 0;

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
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthError(null); // No error if no token and app doesn't require auth
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        setIsLoadingPublicSettings(false);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
            setIsLoadingAuth(false);
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
            setIsLoadingAuth(false);
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
            setIsLoadingAuth(false);
          }
        } else {
          // Network or other errors — try offline fallback
          const cached = await getCachedUserProfile().catch(() => null);
          if (cached && appParams.token) {
            // User was previously logged in — allow offline access
            setUser({ ...cached, profileComplete: true });
            setIsAuthenticated(true);
            setAuthError(null);
          } else {
            // Not cached — treat as auth required
            setIsAuthenticated(false);
          }
          setIsLoadingAuth(false);
          setIsLoadingPublicSettings(false);
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
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
      if (Date.now() - lastAuthFailureAt < AUTH_RETRY_COOLDOWN_MS) {
        const cached = await getCachedUserProfile().catch(() => null);
        if (cached) {
          setUser({ ...cached, profileComplete: true });
          setIsAuthenticated(true);
          setAuthError(null);
        }
        setIsLoadingAuth(false);
        return;
      }
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
      lastAuthFailureAt = Date.now();

      // Rate-limit cooldown: don't retry on 429
      if (error.status === 429) {
        console.warn('[RATE LIMIT] 429 on auth.me — stopping retries, using cache');
        const cached = await getCachedUserProfile().catch(() => null);
        if (cached) {
          setUser({ ...cached, profileComplete: true });
          setIsAuthenticated(true);
          setAuthError(null);
          setIsLoadingAuth(false);
          return;
        }
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthError({ type: 'rate_limit', message: 'Service temporarily unavailable' });
        return;
      }

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
      if (Date.now() - lastAuthFailureAt < AUTH_RETRY_COOLDOWN_MS) {
        const cached = await getCachedUserProfile().catch(() => null);
        if (cached) return cached;
      }
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // Update cache with fresh data
      cacheUserProfile(currentUser).catch(() => {});
      return currentUser;
    } catch (error) {
      console.error('Error refreshing user:', error);
      lastAuthFailureAt = Date.now();
      const cached = await getCachedUserProfile().catch(() => null);
      if (cached) return cached;
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