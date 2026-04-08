import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';

const FeatureFlagContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const FeatureFlagProvider = ({ children }) => {
  const { fetchWithRetry } = useApi();
  const [flags, setFlags] = useState(() => {
    try {
      const saved = localStorage.getItem('momo_flags');
      return saved ? JSON.parse(saved) : {
        BETA_WISH_LIST: false,
        NEW_CHECKOUT_FLOW: false,
        PREMIUM_ADMIN_STATS: false
      };
    } catch (e) { return {}; }
  });

  const syncFlags = useCallback(async () => {
    const result = await fetchWithRetry(`${BACKEND_URL}/api/flags`, { method: 'GET' });
    if (result.success && result.data.flags) {
      setFlags(result.data.flags);
      localStorage.setItem('momo_flags', JSON.stringify(result.data.flags));
    }
  }, [fetchWithRetry, BACKEND_URL]);

  useEffect(() => {
    syncFlags();
  }, [syncFlags]);

  const isEnabled = useCallback((flagName) => flags[flagName] === true, [flags]);

  const value = useMemo(() => ({
    flags,
    isEnabled,
    syncFlags
  }), [flags, isEnabled, syncFlags]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};
