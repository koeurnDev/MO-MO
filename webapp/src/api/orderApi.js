import apiRequest from './index';

export const createOrder = (orderData) => {
  return apiRequest('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
};

export const fetchOrderStatus = (orderCode) => {
  return apiRequest(`/api/orders/status/${orderCode}`);
};

export const fetchUserOrders = (userId, limit = 20, offset = 0) => {
  return apiRequest(`/api/user/orders?userId=${userId}&limit=${limit}&offset=${offset}`);
};

export const submitReview = (reviewData) => {
  return apiRequest('/api/orders/review', {
    method: 'POST',
    body: JSON.stringify(reviewData)
  });
};
