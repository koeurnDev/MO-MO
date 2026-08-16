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
    headers: { 'x-tg-data': tg?.initData || '' },
    revalidateOnMount: true,
  }), [tg?.initData]);

  // Bust stale product cache (images were wiped then restored)
  useEffect(() => {
    try {
      localStorage.removeItem('momo_cache_init');
      localStorage.removeItem('momo_cache_init_v2');
      localStorage.removeItem('momo_cache_init_v3');
      localStorage.removeItem('momo_cache_init_v4');
      localStorage.removeItem('momo_cache_init_v5');
      localStorage.removeItem('momo_cache_init_v6');
      localStorage.removeItem('momo_broken_images');
      localStorage.removeItem('momo_broken_images_v2');
    } catch { /* ignore */ }
  }, []);

  // 🚀 CONSOLIDATED INITIAL DATA FETCHING (v6 Performance Pack)
  const { data: initData, loading: isInitLoading, refetch: refetchInit, mutate: mutateInit } = useQuery(
    'init_v6', 
    `${BACKEND_URL}/api/init`, 
    queryOptions
  );

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [view, setView] = useState('home');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', sort: 'newest' });

  // 🕒 Debounce Search: Prevent expensive re-filtering on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (view !== 'browse') setSearchFocused(false);
  }, [view]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState(null);

  // 🏪 Settings State (Local sync for immediate UI updates)
  const [shopStatus, setShopStatus] = useState('open');
  const [deliveryThreshold, setDeliveryThreshold] = useState('50');
  const [deliveryFee, setDeliveryFee] = useState('1.50');
  const [promoText, setPromoText] = useState('');
  const [promoBannerUrl, setPromoBannerUrl] = useState('');
  const [shopLogoUrl, setShopLogoUrl] = useState('');
  const [socialFb, setSocialFb] = useState('');
  const [socialTg, setSocialTg] = useState('');
  const [socialIg, setSocialIg] = useState('');
  const [socialTt, setSocialTt] = useState('');
  const [socialEmail, setSocialEmail] = useState('');
  const [socialWa, setSocialWa] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopHours, setShopHours] = useState('');
  const [shopName, setShopName] = useState('MARUN MINI STORE');

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

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
        refetchInit(true); // silent refresh
      }
    }, 60000); // 1m sync window (Optimized for Real-time Stock Sync)
    
    // 👁️ Auto-Refresh on View: Trigger sync when user focuses the app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchInit(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchInit]);

  // Sync settings state with query result
  useEffect(() => {
    if (initData?.settings) {
      const s = initData.settings;
      if (s.shop_status) setShopStatus(s.shop_status);
      if ('delivery_threshold' in s) setDeliveryThreshold(String(s.delivery_threshold));
      if ('delivery_fee' in s) setDeliveryFee(String(s.delivery_fee));
      if (s.promo_text !== undefined) setPromoText(s.promo_text);
      if (s.promo_banner_url !== undefined) setPromoBannerUrl(s.promo_banner_url); // fix: allow empty string to clear banners
      if (s.shop_logo_url !== undefined) setShopLogoUrl(s.shop_logo_url);
      if ('social_fb' in s) setSocialFb(s.social_fb || '');
      if ('social_tg' in s) setSocialTg(s.social_tg || '');
      if ('social_ig' in s) setSocialIg(s.social_ig || '');
      if ('social_tt' in s) setSocialTt(s.social_tt || '');
      if ('social_email' in s) setSocialEmail(s.social_email || '');
      if ('social_wa' in s) setSocialWa(s.social_wa || '');
      if ('shop_phone' in s) setShopPhone(s.shop_phone || '');
      if ('shop_address' in s) setShopAddress(s.shop_address || '');
      if ('shop_hours' in s) setShopHours(s.shop_hours || '');
      if (s.receipt_shop_name) setShopName(s.receipt_shop_name);
    }
  }, [initData]);

  const state = useMemo(() => {
    const products = initData?.products || [];
    const settings = initData?.settings || {};
    
    return {
      products,
      shopStatus,
      isSettingsLoaded: Boolean(initData) || !isInitLoading,
      selectedCategory,
      searchTerm,
      debouncedSearchTerm, // 🚀 Use this for filtering
      searchFocused,
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
      socialFb,
      socialTg,
      socialIg,
      socialTt,
      socialEmail,
      socialWa,
      shopPhone,
      shopAddress,
      shopHours,
      shopName,
      activeDiscounts: initData?.discounts || [],
      showFilterModal,
      showScanner,
      filters
    };
  }, [initData, isInitLoading, selectedCategory, searchTerm, debouncedSearchTerm, searchFocused, view, selectedProduct, toast, shopStatus, deliveryThreshold, deliveryFee, promoText, promoBannerUrl, shopLogoUrl, socialFb, socialTg, socialIg, socialTt, socialEmail, socialWa, shopPhone, shopAddress, shopHours, shopName, showFilterModal, showScanner, filters]);

  const dispatch = useMemo(() => ({
    setSelectedCategory,
    setSearchTerm,
    setSearchFocused,
    setView,
    setSelectedProduct,
    showToast,
    setShopStatus,
    setDeliveryThreshold,
    setDeliveryFee,
    setPromoText,
    setPromoBannerUrl,
    setShopLogoUrl,
    setSocialFb,
    setSocialTg,
    setSocialIg,
    setSocialTt,
    setSocialEmail,
    setShowFilterModal,
    setShowScanner,
    setFilters,
    refetchData: (isBackground = false) => refetchInit(isBackground),
    mutateShopData: mutateInit
  }), [refetchInit, showToast, setShopStatus, setDeliveryThreshold, setDeliveryFee, setPromoText, setPromoBannerUrl, setShopLogoUrl, setSocialFb, setSocialTg, setSocialIg, setSocialTt, setSocialEmail, setSearchFocused, setShowFilterModal, setShowScanner, setFilters]);

  return (
    <ShopStateContext.Provider value={state}>
      <ShopDispatchContext.Provider value={dispatch}>
        {children}
        {toast && (
          <div className="user-toast-float">
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
