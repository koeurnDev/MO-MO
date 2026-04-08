const orderService = require('../services/orderService');

const orderController = {
  createOrder: async (req, res) => {
    try {
      const result = await orderService.createOrder(req.body, req.tgUser);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('🔴 Order Controller Error:', err.message);
      res.status(err.message === 'Access Denied' ? 403 : 400).json({ 
        success: false, 
        error: err.message || 'Internal server error' 
      });
    }
  },

  getStatus: async (req, res) => {
    try {
      const order = await orderService.getOrderStatus(req.params.orderCode, req.tgUser);
      res.json({ success: true, status: order.status, order });
    } catch (err) {
      res.status(err.message === 'Access Denied' ? 403 : 404).json({ 
        success: false, 
        error: err.message 
      });
    }
  },

  getUserOrders: async (req, res) => {
    try {
      const { userId } = req.query; // If using query, or req.params if using path
      const targetId = userId || req.params.userId;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = parseInt(req.query.offset) || 0;
      
      const { orders, total } = await orderService.getUserOrders(targetId, limit, offset, req.tgUser);
      
      res.json({ 
        success: true, 
        orders,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total
        }
      });
    } catch (err) {
      res.status(403).json({ success: false, error: err.message });
    }
  },

  confirmOrder: async (req, res) => {
    try {
      const { orderCode } = req.body;
      const order = await orderService.confirmOrderPayment(orderCode, req.tgUser);
      res.json({ success: true, order });
    } catch (err) {
      console.error('🔴 Confirm Order Error:', err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  }
};

module.exports = orderController;
