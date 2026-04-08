const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const apiRequest = async (endpoint, options = {}) => {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || '';
  
  const headers = {
    'Content-Type': 'application/json',
    'X-TG-Data': initData,
    ...options.headers
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export default apiRequest;
export { BACKEND_URL };
