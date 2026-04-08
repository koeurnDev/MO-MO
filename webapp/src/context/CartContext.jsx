import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTelegram } from './TelegramContext';
import { useUser } from './UserContext';
import { useShop, useShopDispatch } from './ShopContext';
import OfflineService from '../services/OfflineService';

const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { tg } = useTelegram();
  const { lang, user } = useUser();
  const { shopStatus } = useShop();
  const { showToast } = useShopDispatch();
  
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('momo_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // Persistent Idempotency Key (Survives refresh/crash during checkout)
  const [idempotencyKey, setIdempotencyKey] = useState(() => {
    return localStorage.getItem('momo_idemp_key') || null;
  });

  const [flyingItems, setFlyingItems] = useState([]);
  const cartIconRef = useRef(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('momo_cart_v1', JSON.stringify(cart));
    if (cart.length === 0) {
      localStorage.removeItem('momo_idemp_key');
      setIdempotencyKey(null);
    }
  }, [cart]);

  useEffect(() => {
    if (idempotencyKey) localStorage.setItem('momo_idemp_key', idempotencyKey);
    else localStorage.removeItem('momo_idemp_key');
  }, [idempotencyKey]);

  const addToCart = useCallback((product, e) => {
    if (shopStatus === 'closed') return;

    if (e && cartIconRef.current) {
      const rect = cartIconRef.current.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;
      setFlyingItems(prev => [...prev, {
        id: Date.now(),
        startX: e.clientX,
        startY: e.clientY,
        endX: targetX,
        endY: targetY
      }]);
      setTimeout(() => setFlyingItems(prev => prev.slice(1)), 1000);
    }

    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    // 🍞 Luxury Toast Feedback
    if (showToast) {
       showToast(lang === 'kh' ? `បានដាក់ ${product.name} ទៅក្នុងកន្ត្រក` : `Added ${product.name} to cart`);
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, [shopStatus, tg, lang]);

  const updateQty = useCallback((id, delta) => {
    setCart(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item);
      return updated.filter(item => item.quantity > 0);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem('momo_idemp_key');
    setIdempotencyKey(null);
  }, []);

  const prepareIdempotency = useCallback(() => {
    const key = Math.random().toString(36).substring(2) + Date.now();
    setIdempotencyKey(key);
    return key;
  }, []);

  const cartInfo = useMemo(() => ({
    cart,
    totalPrice: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    totalItemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    flyingItems,
    cartIconRef,
    idempotencyKey
  }), [cart, flyingItems, idempotencyKey]);

  const dispatch = useMemo(() => ({
    addToCart,
    updateQty,
    clearCart,
    prepareIdempotency
  }), [addToCart, updateQty, clearCart, prepareIdempotency]);

  return (
    <CartStateContext.Provider value={cartInfo}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
};

export const useCart = () => {
  const state = useContext(CartStateContext);
  const dispatch = useContext(CartDispatchContext);
  if (!state || !dispatch) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return { ...state, ...dispatch };
};

export const useCartState = () => useContext(CartStateContext);
export const useCartDispatch = () => useContext(CartDispatchContext);
