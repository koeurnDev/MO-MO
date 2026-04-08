const wishlistRepository = require('../repositories/wishlistRepository');

const wishlistService = {
  getWishlist: async (userId, requesterId) => {
    if (String(userId) !== String(requesterId)) {
      throw new Error('Access Denied');
    }
    return await wishlistRepository.findByUserId(userId);
  },

  toggleWishlist: async (userId, productId, requesterId) => {
    if (String(userId) !== String(requesterId)) {
      throw new Error('Access Denied');
    }

    const hasItem = await wishlistRepository.exists(userId, productId);
    if (hasItem) {
      await wishlistRepository.remove(userId, productId);
      return { added: false };
    } else {
      await wishlistRepository.add(userId, productId);
      return { added: true };
    }
  }
};

module.exports = wishlistService;
