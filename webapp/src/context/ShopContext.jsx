import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useTelegram } from './TelegramContext';
import { useQuery } from '../hooks/useQuery';
import OfflineService from '../services/OfflineService';
import { useApi } from '../hooks/useApi';

const ShopStateContext = createContext(null);
const ShopDispatchContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const ShopProvider = ({ children }) => {
  const { tg } = useTelegram();
  const { fetchWithRetry } = useApi();
  
  const queryOptions = useMemo(() => ({ 
    headers: { 'x-tg-data': tg?.initData || '' } 
  }), [tg?.initData]);

  // Use SWR standard pattern with useQuery
  const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useQuery(
    'products', 
    `${BACKEND_URL}/api/products`, 
    queryOptions
  );

  const { data: settingsData, loading: settingsLoading, refetch: refetchSettings } = useQuery(
    'settings', 
    `${BACKEND_URL}/api/settings`, 
    queryOptions
  );

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState(null);

  // 🏪 Settings State (Local sync for immediate UI updates)
  const [shopStatus, setShopStatus] = useState('open');
  const [deliveryThreshold, setDeliveryThreshold] = useState('50');
  const [deliveryFee, setDeliveryFee] = useState('1.50');
  const [promoText, setPromoText] = useState('');
  const [promoBannerUrl, setPromoBannerUrl] = useState('');
  const [shopLogoUrl, setShopLogoUrl] = useState('');

  const showToast = useCallback((message) => {
    setToast(message);
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    setTimeout(() => setToast(null), 2500);
  }, [tg]);

  // Sync outbox on online event
  useEffect(() => {
    const handleSync = () => OfflineService.syncOutbox(fetchWithRetry);
    window.addEventListener('online', handleSync);
    // Trigger initial check if online
    if (navigator.onLine) handleSync();
    return () => window.removeEventListener('online', handleSync);
  }, [fetchWithRetry]);

  // 🚀 Real-time Sync: Background polling for products/settings
  useEffect(() => {
    const interval = setInterval(() => {
      // 🛡️ Only sync if tab is visible to save battery/bandwidth
      if (document.visibilityState === 'visible') {
        refetchProducts(true); // silent refresh
        refetchSettings(true); // silent refresh
      }
    }, 30000); // 30s sync window
    
    return () => clearInterval(interval);
  }, [refetchProducts, refetchSettings]);

  // Sync settings state with query result
  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      if (s.shop_status) setShopStatus(s.shop_status);
      if (s.delivery_threshold) setDeliveryThreshold(s.delivery_threshold);
      if (s.delivery_fee) setDeliveryFee(s.delivery_fee);
      if (s.promo_text) setPromoText(s.promo_text);
      if (s.promo_banner_url) setPromoBannerUrl(s.promo_banner_url);
      if (s.shop_logo_url) setShopLogoUrl(s.shop_logo_url);
    }
  }, [settingsData]);

  const state = useMemo(() => {
    const products = productsData?.products || [];
    const settings = settingsData?.settings || {};
    
    return {
      products,
      shopStatus,
      isSettingsLoaded: !settingsLoading,
      selectedCategory,
      searchTerm,
      view,
      selectedProduct,
      toast,
      deliveryThreshold,
      deliveryFee,
      promoText,
      paymentQrUrl: settings.payment_qr_url || '',
      paymentInfo: settings.payment_info || '',
      promoBannerUrl,
      shopLogoUrl,
      activeDiscounts: settings.active_discounts || []
    };
  }, [productsData, settingsData, settingsLoading, selectedCategory, searchTerm, view, selectedProduct, toast, shopStatus, deliveryThreshold, deliveryFee, promoText, promoBannerUrl, shopLogoUrl]);

  const dispatch = useMemo(() => ({
    setSelectedCategory,
    setSearchTerm,
    setView,
    setSelectedProduct,
    showToast,
    setShopStatus,
    setDeliveryThreshold,
    setDeliveryFee,
    setPromoText,
    setPromoBannerUrl,
    setShopLogoUrl,
    refetchData: () => {
      refetchProducts();
      refetchSettings();
    }
  }), [refetchProducts, refetchSettings, showToast, setShopStatus, setDeliveryThreshold, setDeliveryFee, setPromoText, setPromoBannerUrl, setShopLogoUrl]);

  return (
    <ShopStateContext.Provider value={state}>
      <ShopDispatchContext.Provider value={dispatch}>
        {children}
        {toast && (
          <div className="user-toast-float">
             <span>✨</span>
             <span>{toast}</span>
          </div>
        )}
      </ShopDispatchContext.Provider>
    </ShopStateContext.Provider>
  );
};

export const useShop = () => {
  const state = useContext(ShopStateContext);
  const dispatch = useContext(ShopDispatchContext);
  if (!state || !dispatch) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return { ...state, ...dispatch };
};

export const useShopState = () => useContext(ShopStateContext);
export const useShopDispatch = () => useContext(ShopDispatchContext);
