import apiRequest from './index';

export const fetchSettings = (keys) => {
  const query = keys ? `?keys=${keys.join(',')}` : '';
  return apiRequest(`/api/settings${query}`);
};

export const fetchInitialData = () => {
  return apiRequest('/api/init');
};

export const fetchProducts = () => {
  return apiRequest('/api/products');
};

export const sendTelemetry = (metric, value, userId) => {
  return apiRequest('/api/telemetry', {
    method: 'POST',
    body: JSON.stringify({ metric, value, user_id: userId })
  });
};
