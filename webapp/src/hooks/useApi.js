import { useCallback, useState, useMemo } from 'react';

const DEFAULT_CONFIG = {
  retries: 3,
  retryDelay: 1000,
  exponential: true,
};

export const useApi = (customConfig = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...customConfig
  }), [JSON.stringify(customConfig)]);

  const fetchWithRetry = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    let attempts = 0;
    
    const executeFetch = async () => {
      try {
        const response = await fetch(url, options);
        
        if (response.status === 429) {
          throw new Error('RATE_LIMITED');
        }
        
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || `HTTP Error: ${response.status}`);
          }
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        return { data, success: true };
      } catch (err) {
        attempts++;
        
        if (err.message === 'RATE_LIMITED') {
          return { error: 'Too many requests. Please wait.', success: false, status: 429 };
        }

        if (attempts < config.retries && (options.method === 'GET' || options.idempotent)) {
          const delay = config.exponential 
            ? config.retryDelay * Math.pow(2, attempts - 1) 
            : config.retryDelay;
          
          await new Promise(res => setTimeout(res, delay));
          return executeFetch();
        }
        
        setError(err.message);
        return { error: err.message, success: false };
      } finally {
        setLoading(false);
      }
    };

    return executeFetch();
  }, [config]);

  return useMemo(() => ({ fetchWithRetry, loading, error }), [fetchWithRetry, loading, error]);
};
