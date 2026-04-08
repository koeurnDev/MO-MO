const wishlistService = require('../services/wishlistService');

const wishlistController = {
  get: async (req, res) => {
    try {
      const wishlist = await wishlistService.getWishlist(req.params.userId, req.tgUser.id);
      res.json({ success: true, wishlist });
    } catch (err) {
      console.error('🔴 Wishlist Fetch Error:', err.message);
      res.status(err.message === 'Access Denied' ? 403 : 500).json({ success: false, error: err.message });
    }
  },

  toggle: async (req, res) => {
    try {
      const { userId, productId } = req.body;
      const result = await wishlistService.toggleWishlist(userId, productId, req.tgUser.id);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('🔴 Wishlist Toggle Error:', err.message);
      res.status(err.message === 'Access Denied' ? 403 : 500).json({ success: false, error: err.message });
    }
  }
};

module.exports = wishlistController;
