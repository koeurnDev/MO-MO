import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import AdminSkeleton from './AdminSkeleton';
import { useTelegram } from '../context/TelegramContext';
import { useUser } from '../context/UserContext';
import { useQuery } from '../hooks/useQuery';
import { useApi } from '../hooks/useApi';
import useScrollHideBar from '../hooks/useScrollHideBar';
import { useShopDispatch } from '../context/ShopContext';
import ProductDetail from './ProductDetail';
import { compressImage } from '../utils/imageUtils';
import {
  parseBannerEntries,
  serializeBannerEntries,
  migrateBannerLinkTargets
} from '../utils/bannerLinkUtils';
import { formatFullAddress } from '../utils/deliveryUtils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/admin-dashboard.css';

// 🗂️ Modular tab sub-components (Senior Review Fix: split monolithic component)
import AdminOverviewTab from './admin/AdminOverviewTab';
import AdminOrdersTab from './admin/AdminOrdersTab';
import AdminProductsTab from './admin/AdminProductsTab';
import AdminBroadcastTab from './admin/AdminBroadcastTab';
import AdminFaqsTab from './admin/AdminFaqsTab';
import AdminSettingsTab from './admin/AdminSettingsTab';
import AdminCustomersTab from './admin/AdminCustomersTab';
import AdminCouponsTab from './admin/AdminCouponsTab';
import DarkSelect from './admin/DarkSelect';

// 🗂️ Modular modals
import AdminEditProductModal from './admin/modals/AdminEditProductModal';
import InvoiceModal from './InvoiceModal';
import AdminAddProductModal from './admin/modals/AdminAddProductModal';
import AdminFaqModal from './admin/modals/AdminFaqModal';

const AdminDashboard = ({
  BACKEND_URL,
  setView,
  setPromoBannerUrl: setGlobalPromoBannerUrl,
  setPromoText: setGlobalPromoText,
  setShopStatus: setGlobalShopStatus,
  setDeliveryFee: setGlobalDeliveryFee,
  setDeliveryThreshold: setGlobalDeliveryThreshold,
  setShopLogoUrl: setGlobalShopLogoUrl,
  theme
}) => {
  const { tg, initData, showAlert: tgShowAlert } = useTelegram();
  const { t, lang } = useUser();
  const { fetchWithRetry } = useApi();
  const { refetchData: refetchShopData, mutateShopData } = useShopDispatch();
  const headers = useMemo(() => ({ 'X-TG-Data': initData || '' }), [initData]);


  const [activeTab, setActiveTab] = useState('overview');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [localProductSearchTerm, setLocalProductSearchTerm] = useState('');
  const [visibleProductLimit, setVisibleProductLimit] = useState(30);
  const [orderFilter, setOrderFilter] = useState('all');
  const [trackingNumbers, setTrackingNumbers] = useState({});
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🛰️ BATCHED Data Fetching: Reduces 6 parallel connections to 1
  const {
    data: dashboardData,
    loading: dashboardLoading,
    refetch: refetchDashboard,
    mutate: mutateDashboard
  } = useQuery('admin-dashboard', `${BACKEND_URL}/api/admin/dashboard`, { headers });

  const userRole = dashboardData?.userRole || (dashboardLoading ? 'admin' : 'staff');

  useEffect(() => {
    if (userRole === 'staff' && activeTab === 'overview') {
      setActiveTab('orders');
    }
  }, [userRole, activeTab]);

  // Derived state from consolidated query
  const { data: advancedAnalyticsData } = useQuery('admin-advanced-analytics', `${BACKEND_URL}/api/admin/advanced-analytics`, { headers });
  const advancedAnalytics = advancedAnalyticsData?.data || { topProducts: [], topCustomers: [], aov: { aov: 0, aov_30d: 0 } };

  const summary = dashboardData?.summary || { totalRevenue: 0, totalOrders: 0, activeOrders: 0, totalCustomers: 0, businessHealth: 100 };
  const orders = dashboardData?.orders || [];
  const analytics = dashboardData ? { daily: dashboardData.analytics?.daily || [], status: dashboardData.analytics?.status || [] } : { daily: [], status: [] };
  const paddedDailyAnalytics = useMemo(() => {
    const daily = analytics.daily || [];
    const dataMap = new Map(daily.map(d => [d.date.slice(0, 10), d]));
    const padded = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const shortDate = `${dateStr.slice(8, 10)}-${dateStr.slice(5, 7)}`;
      if (dataMap.has(dateStr)) {
        padded.push({ ...dataMap.get(dateStr), dateShort: shortDate, revenue: parseFloat(dataMap.get(dateStr).revenue), orders: parseInt(dataMap.get(dateStr).orders) });
      } else {
        padded.push({ date: dateStr, dateShort: shortDate, revenue: 0, orders: 0 });
      }
    }
    return padded;
  }, [analytics.daily]);
  const products = dashboardData?.products || [];
  const categories = dashboardData?.categories || [];
  const settingsData = dashboardData; // Alias for settings logic compatibility


  // Settings specific state
  const [shopStatus, setShopStatus] = useState('open');
  const [deliveryThreshold, setDeliveryThreshold] = useState('50');
  const [deliveryFee, setDeliveryFee] = useState('1.50');
  const [promoText, setPromoText] = useState('');
  const [promoBannerUrl, setPromoBannerUrl] = useState('');
  const [shopLogoUrl, setShopLogoUrl] = useState('');
  const [paymentQrUrl, setPaymentQrUrl] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [receiptShopName, setReceiptShopName] = useState('MARUN MINI STORE');
  const [receiptSubtitle, setReceiptSubtitle] = useState('អីវ៉ាន់បោះដុំ និងរាយ');
  const [receiptNote, setReceiptNote] = useState('សូមអរគុណសម្រាប់ការគាំទ្រ!');
  const [socialFb, setSocialFb] = useState('');
  const [socialTg, setSocialTg] = useState('');
  const [socialIg, setSocialIg] = useState('');
  const [socialTt, setSocialTt] = useState('');
  const [socialEmail, setSocialEmail] = useState('');
  const [socialWa, setSocialWa] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopHours, setShopHours] = useState('');

  // Debounce search terms for performance
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(localSearchTerm), 300);
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setProductSearchTerm(localProductSearchTerm), 300);
    return () => clearTimeout(timer);
  }, [localProductSearchTerm]);

  useEffect(() => {
    if (settingsData?.success) {
      const s = settingsData.settings;
      setShopStatus(s.shop_status || 'open');
      setDeliveryThreshold('delivery_threshold' in s ? String(s.delivery_threshold) : '50');
      setDeliveryFee('delivery_fee' in s ? String(s.delivery_fee) : '1.50');
      setPromoText(s.promo_text || '');
      setPromoBannerUrl(s.promo_banner_url || '');
      setShopLogoUrl(s.shop_logo_url || '');
      setPaymentQrUrl(s.payment_qr_url || '');
      setPaymentInfo(s.payment_info || '');
      setReceiptShopName(s.receipt_shop_name || 'MARUN MINI STORE');
      setReceiptSubtitle(s.receipt_subtitle || 'អីវ៉ាន់បោះដុំ និងរាយ');
      setReceiptNote(s.receipt_note || 'សូមអរគុណសម្រាប់ការគាំទ្រ!');
      setSocialFb(s.social_fb || '');
      setSocialTg(s.social_tg || '');
      setSocialIg(s.social_ig || '');
      setSocialTt(s.social_tt || '');
      setSocialEmail(s.social_email || '');
      setSocialWa(s.social_wa || '');
      setShopPhone(s.shop_phone || '');
      setShopAddress(s.shop_address || '');
      setShopHours(s.shop_hours || '');
    }
  }, [settingsData]);

  const loading = dashboardLoading;


  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastImage, setBroadcastImage] = useState('');

  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', price: '', stock: '' });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '', price: '', stock: '', category: 'ទឹកអប់ (Perfume)',
    image: '', description: '', additional_images: [], flash_sale_price: '', flash_sale_end: '', video_url: ''
  });

  const [confirmDialog, setConfirmDialog] = useState(null); // Now used for BeautyModal
  const [printingOrder, setPrintingOrder] = useState(null);
  const [previewFavorited, setPreviewFavorited] = useState(false);

  // FAQ State
  const { data: faqsData, loading: faqsLoading, refetch: refetchFaqs } = useQuery('admin-faqs', `${BACKEND_URL}/api/admin/faqs`, { headers });
  const faqsList = faqsData?.faqs || [];
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  const handleSaveFaq = async () => {
    try {
      const isEdit = !!editingFaq.id;
      const url = isEdit ? `${BACKEND_URL}/api/admin/faqs/${editingFaq.id}` : `${BACKEND_URL}/api/admin/faqs`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetchWithRetry(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(editingFaq)
      });

      if (res.success) {
        setIsFaqModalOpen(false);
        refetchFaqs();
        setToastMessage('រក្សាទុក FAQ ជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
      }
    } catch (err) {
      alert('បរាជ័យក្នុងការរក្សាទុក FAQ: ' + err.message);
    }
  };

  const handleDeleteFaq = (id) => {
    showConfirm('តើអ្នកពិតជាចង់លុបសំណួរនេះមែនទេ?', () => {
      fetchWithRetry(`${BACKEND_URL}/api/admin/faqs/${id}`, {
        method: 'DELETE',
        headers
      }).then(() => {
        refetchFaqs();
        setToastMessage('លុប FAQ ជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
      });
    }, '🗑️');
  };

  const refetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      await Promise.all([
        refetchDashboard(isBackground),
        refetchShopData(isBackground),
        refetchFaqs(isBackground)
      ]);
      if (!isBackground) {
        setToastMessage(lang === 'kh' ? 'ធ្វើបច្ចុប្បន្នភាពរួចហើយ' : 'Data refreshed');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 1800);
      }
    } finally {
      if (!isBackground) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  }, [refetchDashboard, refetchShopData, refetchFaqs, lang]);

  // 🔒 Senior Review Fix: use stable ref to avoid interval reset on refetchData identity change
  const refetchDataRef = useRef(refetchData);
  useEffect(() => { refetchDataRef.current = refetchData; }, [refetchData]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refetchDataRef.current(true);
      }
    }, 300000);
    return () => clearInterval(interval);
  }, []); // ✅ Empty deps — interval never resets

  const updatingStatusRef = useRef(new Set());

  const updateStatus = async (orderId, status) => {
    const normalizedId = String(orderId);
    if (updatingStatusRef.current.has(normalizedId)) return;
    updatingStatusRef.current.add(normalizedId);

    const trackingNumber = trackingNumbers[orderId] ?? trackingNumbers[normalizedId] ?? '';

    const applyOrderPatch = (patch) => {
      mutateDashboard(prev => {
        if (!prev?.orders) return prev;
        return {
          ...prev,
          orders: prev.orders.map(o => (
            String(o.id) === normalizedId || String(o.order_code || '') === normalizedId
              ? { ...o, ...patch }
              : o
          ))
        };
      });
    };

    // Optimistic UI update
    applyOrderPatch({ status });

    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/orders/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ orderId: normalizedId, status, trackingNumber })
      });

      if (!res?.success) {
        refetchData(true);
        showAlert('បរាជ័យ: ' + (res?.error || 'មានបញ្ហាប្រព័ន្ធ'));
        return;
      }

      const payload = res.data;
      if (!payload?.success) {
        refetchData(true);
        showAlert('បរាជ័យ: ' + (payload?.error || 'មានបញ្ហាប្រព័ន្ធ'));
        return;
      }

      if (payload.order) {
        applyOrderPatch(payload.order);
      }

      setToastMessage('បច្ចុប្បន្នភាពជោគជ័យ!');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);

      if (tg?.isVersionAtLeast?.('6.1') && tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

      setTrackingNumbers(prev => {
        const next = { ...prev };
        delete next[orderId];
        delete next[normalizedId];
        return next;
      });
    } catch (err) {
      refetchData(true);
      showAlert('បរាជ័យ: ' + err.message);
    } finally {
      updatingStatusRef.current.delete(normalizedId);
    }
  };

  const showAlert = (msg) => {
    if (tg?.showAlert) {
      try { tg.showAlert(msg); } catch (e) {}
    }
    setConfirmDialog({
      text: msg,
      onConfirm: () => setConfirmDialog(null),
      isAlert: true,
      icon: '✨'
    });
  };

  const showConfirm = (msg, onConfirm, icon = '❓') => {
    setConfirmDialog({
      text: msg,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
      isAlert: false,
      icon
    });
  };

  const submitAddProduct = async () => {
    if (!newProductData.name || !newProductData.price) return showAlert('សូមបំពេញឈ្មោះ និងតម្លៃ!');
    setIsSaving(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...newProductData,
          price: parseFloat(newProductData.price),
          stock: parseInt(newProductData.stock) || 0,
          additional_images: JSON.stringify(newProductData.additional_images || []),
          flash_sale_price: newProductData.flash_sale_price ? parseFloat(newProductData.flash_sale_price) : null,
          flash_sale_end: newProductData.flash_sale_end || null,
          video_url: newProductData.video_url || null
        })
      });
      if (res.success && res.data?.success !== false) {
        setIsAddingProduct(false);
        const newProduct = res.data?.product || res.data;
        if (newProduct) {
          mutateDashboard(prev => ({
            ...prev,
            products: [newProduct, ...(prev?.products || [])]
          }));
          if (mutateShopData) {
            mutateShopData(prev => ({
              ...prev,
              products: [newProduct, ...(prev?.products || [])]
            }));
          }
        }
        setNewProductData({ name: '', price: '', stock: '', category: 'ទឹកអប់ (Perfume)', image: '', description: '', additional_images: [] });
        refetchData(true);
        refetchShopData(true);
        setToastMessage('បន្ថែមទំនិញបានជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        showAlert('បរាជ័យក្នុងការបន្ថែម: ' + (res.error || res.data?.error || 'មានបញ្ហាប្រព័ន្ធ'));
      }
    } catch (err) {
      showAlert('បរាជ័យក្នុងការបន្ថែម: ' + (err.message || 'មានបញ្ហាប្រព័ន្ធ'));
    } finally { setIsSaving(false); }
  };

  const submitEditProduct = async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...editingProduct,
          ...editFormData,
          price: parseFloat(editFormData.price),
          stock: parseInt(editFormData.stock),
          additional_images: JSON.stringify(editFormData.additional_images || []),
          flash_sale_price: editFormData.flash_sale_price ? parseFloat(editFormData.flash_sale_price) : null,
          flash_sale_end: editFormData.flash_sale_end || null,
          video_url: editFormData.video_url || null
        })
      });
      if (res.success && res.data?.success !== false) {
        setEditingProduct(null);
        const updatedProduct = res.data?.product || res.data;
        if (updatedProduct) {
          mutateDashboard(prev => ({
            ...prev,
            products: (prev?.products || []).map(p => p.id === updatedProduct.id ? updatedProduct : p)
          }));
          if (mutateShopData) {
            mutateShopData(prev => ({
              ...prev,
              products: (prev?.products || []).map(p => p.id === updatedProduct.id ? updatedProduct : p)
            }));
          }
        }
        refetchData(true);
        refetchShopData(true);
        setToastMessage('កែប្រែទំនិញជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2000);
      } else {
        showAlert('បរាជ័យក្នុងការកែប្រែ: ' + (res.error || res.data?.error || 'មានបញ្ហាប្រព័ន្ធ'));
      }
    } catch (err) { showAlert('Error: ' + err.message); }
    finally { setIsSaving(false); }
  };

  const handleDeleteProduct = (productId, productName) => {
    showConfirm(`តើអ្នកពិតជាចង់លុបទំនិញ "${productName}" មែនទេ?`, async () => {
      try {
        const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products/${productId}`, {
          method: 'DELETE',
          headers
        });
        if (res.success) {
          mutateDashboard(prev => ({
            ...prev,
            products: (prev?.products || []).filter(p => p.id !== productId)
          }));
          if (mutateShopData) {
            mutateShopData(prev => ({
              ...prev,
              products: (prev?.products || []).filter(p => p.id !== productId)
            }));
          }
          refetchData(true);
          refetchShopData(true);
          setToastMessage('លុបទំនិញជោគជ័យ!');
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 2000);
        } else {
          showAlert('បរាជ័យ: ' + (res.error || 'មានបញ្ហាប្រព័ន្ធ'));
        }
      } catch (err) {
        showAlert('បរាជ័យ: ' + err.message);
      }
    }, '🗑️');
  };

  const handleBroadcastUpload = async (file) => {
    const formData = new FormData();
    const compressed = await compressImage(file);
    formData.append('image', compressed);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: headers, body: formData });
      if (res.success) setBroadcastImage(res.data?.url);
    } finally { }
  };

  const handlePreview = (data) => {
    // Transform form data into product object structure for ProductDetail component
    const mockProduct = {
      ...data,
      id: 9999,
      price: parseFloat(data.price) || 0,
      stock: parseInt(data.stock) || 0,
    };
    setPreviewData(mockProduct);
    setIsPreviewing(true);
  };
  const handleBroadcast = async () => {
    if (!broadcastMsg.trim() && !broadcastImage) return;
    setIsBroadcasting(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ message: broadcastMsg, photoUrl: broadcastImage })
      });
      if (res.success) {
        setToastMessage(`បានផ្ញើដល់ Telegram (${res.data?.count || 0} នាក់) + App`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        setBroadcastMsg('');
        setBroadcastImage('');
      }
    } finally { setIsBroadcasting(false); }
  };

  const updateSettingValue = async (key, value) => {
    try {
      const data = await fetchWithRetry(`${BACKEND_URL}/api/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ key, value })
      });

      if (data && data.success) {
        setToastMessage('រក្សាទុកជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);

        if (mutateShopData) {
          mutateShopData(prev => ({
            ...prev,
            settings: {
              ...(prev?.settings || {}),
              [key]: value
            }
          }));
        }

        if (key === 'shop_status') setGlobalShopStatus(value);
        if (key === 'promo_text') setGlobalPromoText(value);
        if (key === 'promo_banner_url') setGlobalPromoBannerUrl(value);
        if (key === 'delivery_fee') setGlobalDeliveryFee(value);
        if (key === 'delivery_threshold') setGlobalDeliveryThreshold(value);
        if (key === 'shop_logo_url') setGlobalShopLogoUrl(value);
        if (key === 'payment_qr_url') setPaymentQrUrl(value);
        if (key === 'payment_info') setPaymentInfo(value);
        refetchShopData(true);
        return true;
      } else {
        showAlert('បរាជ័យក្នុងការរក្សាទុក: ' + (data?.error || 'មានបញ្ហាប្រព័ន្ធ'));
        return false;
      }
    } catch (err) {
      showAlert('បរាជ័យក្នុងការរក្សាទុក: ' + err.message);
      return false;
    }
  };

  const handleBannerUpload = async (file) => {
    const formData = new FormData();
    const compressed = await compressImage(file);
    formData.append('image', compressed);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: headers, body: formData });
      if (res.success && (res.url || res.data?.url)) {
        const url = res.url || res.data.url;
        const entries = parseBannerEntries(promoBannerUrl);
        entries.push({ url, rawTarget: '' });
        const newBanners = serializeBannerEntries(entries);
        const saved = await updateSettingValue('promo_banner_url', newBanners);
        if (saved) {
          setPromoBannerUrl(newBanners);
          setGlobalPromoBannerUrl(newBanners);
        }
      } else {
        showAlert('បរាជ័យក្នុងការបញ្ចូលរូប Banner: ' + (res.error || 'មានបញ្ហាក្នុងការបញ្ចូលរូបភាព'));
      }
    } catch (e) {
      showAlert('បរាជ័យក្នុងការបញ្ចូលរូប Banner: ' + e.message);
    }
  };

  const removeBanner = async (indexToRemove) => {
    const entries = parseBannerEntries(promoBannerUrl);
    const removedBanner = entries[indexToRemove];
    if (!removedBanner) return;
    entries.splice(indexToRemove, 1);
    const newBanners = serializeBannerEntries(entries);
    const previousBanners = promoBannerUrl;

    setPromoBannerUrl(newBanners);
    setGlobalPromoBannerUrl(newBanners);
    if (mutateShopData) {
      mutateShopData(prev => ({
        ...prev,
        settings: { ...(prev?.settings || {}), promo_banner_url: newBanners }
      }));
    }

    const saved = await updateSettingValue('promo_banner_url', newBanners);
    if (!saved) {
      setPromoBannerUrl(previousBanners);
      setGlobalPromoBannerUrl(previousBanners);
    } else if (removedBanner?.url) {
      fetchWithRetry(`${BACKEND_URL}/api/admin/delete-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ url: removedBanner.url })
      }).catch(() => {});
    }
  };

  const updateBannerProduct = async (index, linkTarget) => {
    const entries = parseBannerEntries(promoBannerUrl);
    if (index < 0 || index >= entries.length) return;

    const url = entries[index].url;
    entries[index] = { url, rawTarget: linkTarget || '' };
    const newBanners = serializeBannerEntries(entries);
    const previousBanners = promoBannerUrl;

    setPromoBannerUrl(newBanners);
    setGlobalPromoBannerUrl(newBanners);

    const saved = await updateSettingValue('promo_banner_url', newBanners);
    if (!saved) {
      setPromoBannerUrl(previousBanners);
      setGlobalPromoBannerUrl(previousBanners);
    }
  };

  const bannerLinksMigratedRef = useRef(false);
  useEffect(() => {
    if (bannerLinksMigratedRef.current || !promoBannerUrl || !categories.length) return;

    const { raw, changed } = migrateBannerLinkTargets(promoBannerUrl, categories);
    bannerLinksMigratedRef.current = true;
    if (!changed) return;

    setPromoBannerUrl(raw);
    setGlobalPromoBannerUrl(raw);
    updateSettingValue('promo_banner_url', raw);
  }, [promoBannerUrl, categories]);

  const handleLogoUpload = async (file) => {
    const formData = new FormData();
    const compressed = await compressImage(file);
    formData.append('image', compressed);
    setIsUploading(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: formData });
      if (res.success && (res.url || res.data?.url)) {
        const url = res.url || res.data.url;
        const saved = await updateSettingValue('shop_logo_url', url);
        if (saved) {
          setShopLogoUrl(url);
          setGlobalShopLogoUrl(url);
        }
      } else {
        showAlert('បរាជ័យក្នុងការបញ្ចូលរូប Logo: ' + (res.error || 'មានបញ្ហាប្រព័ន្ធ'));
      }
    } catch (err) {
      showAlert('បរាជ័យក្នុងការបញ្ចូលរូប Logo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };
  const handleQrUpload = async (file) => {
    const formData = new FormData();
    const compressed = await compressImage(file);
    formData.append('image', compressed);
    setIsUploading(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: formData });
      if (res.success && res.data?.url) {
        const saved = await updateSettingValue('payment_qr_url', res.data.url);
        if (saved) {
          setPaymentQrUrl(res.data.url);
        }
      } else {
        showAlert('បរាជ័យក្នុងការបញ្ចូលរូប QR: ' + (res.error || 'មានបញ្ហាប្រព័ន្ធ'));
      }
    } catch (err) {
      showAlert('បរាជ័យក្នុងការបញ្ចូលរូប QR: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleScanBrokenImages = () => {
    showConfirm('ស្កេនរូប Cloudinary 404? រូបបាត់នឹង clear ពី DB — re-upload ក្នុង Admin។', async () => {
      try {
        const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products/scan-images`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ clearDb: true }),
        });
        if (res.success) {
          const broken = res.data?.broken?.length ?? 0;
          showAlert(broken
            ? `រកឃើញ ${broken} រូបបាត់ — cleared។ Re-upload ក្នុង Products tab។`
            : '✅ រូបទាំងអស់ OK!');
          refetchDashboard();
        } else {
          showAlert(res.error || 'Scan failed');
        }
      } catch (err) {
        showAlert('Scan failed: ' + err.message);
      }
    }, '🖼️');
  };

  const statusTags = {
    'pending': { label: 'រង់ចាំការបញ្ជាក់', color: 'var(--text-main)', icon: '⏳' },
    'paid': { label: 'កំពុងរៀបចំ', color: 'var(--text-main)', icon: '📦' },
    'processing': { label: 'កំពុងរៀបចំ', color: 'var(--text-main)', icon: '📦' },
    'shipped': { label: 'ប្រគល់ជូនអ្នកដឹក', color: 'var(--text-main)', icon: '🚚' },
    'delivering': { label: 'ប្រគល់ជូនអ្នកដឹក', color: 'var(--text-main)', icon: '🚚' },
    'delivered': { label: 'ប្រគល់ជូនអ្នកដឹក', color: 'var(--text-main)', icon: '🚚' },
    'cancelled': { label: 'បានបោះបង់', color: 'var(--text-dim)', icon: '' }
  };

  const chromeVisible = useScrollHideBar({ enabled: true, resetKey: activeTab });

  return (
    <>
      {printingOrder && <InvoiceModal 
        order={printingOrder} 
        onClose={() => setPrintingOrder(null)} 
        paymentQrUrl={null} 
        paymentInfo={''} 
        BACKEND_URL={BACKEND_URL} 
        onPaymentSuccess={() => {}} 
        t={t} 
        lang={tg?.language_code === 'en' ? 'en' : 'kh'} 
      />}
      <div className="admin-dashboard-overhaul animate-in no-print">
        <div className={`admin-sticky-chrome${chromeVisible ? '' : ' admin-sticky-chrome--hidden'}`}>
          <div className="admin-header-luxury">
            <div className="admin-header-brand">
              <span className="admin-header-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </span>
              <h2 className="admin-title-pro">
                <span className="admin-title-kh">{lang === 'kh' ? 'គ្រប់គ្រង MARUN MINI STORE' : 'Manage MARUN MINI STORE'}</span>
              </h2>
            </div>
            <div className="admin-header-actions">
              <button
                type="button"
                onClick={() => refetchData(false)}
                className={`admin-header-icon-btn${isRefreshing ? ' admin-header-icon-btn--spin' : ''}`}
                aria-label={t('admin_refresh')}
                title={t('admin_refresh')}
                disabled={isRefreshing}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <button type="button" onClick={() => setView('home')} className="back-btn-pill admin-header-exit-btn">← {t('admin_logout')}</button>
            </div>
          </div>

          <div className="admin-nav-luxury-grid">
            {[
              ...(userRole === 'admin' ? [{ id: 'overview', label: t('admin_tab_overview') }] : []),
              { id: 'orders', label: t('admin_tab_orders') },
              { id: 'products', label: t('admin_tab_products') },
              { id: 'broadcast', label: t('admin_tab_broadcast') },
              { id: 'faqs', label: t('admin_tab_faqs') },
              ...(userRole === 'admin' ? [
                { id: 'customers', label: t('admin_tab_customers') },
                { id: 'coupons', label: t('admin_tab_coupons') },
                { id: 'settings', label: t('admin_tab_settings') }
              ] : [])
            ].map(tab => (
              <button key={tab.id} className={`nav-pill-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-tab-content">
          {activeTab === 'overview' && (
            <AdminOverviewTab
              BACKEND_URL={BACKEND_URL}
              summary={summary}
              paddedDailyAnalytics={paddedDailyAnalytics}
              advancedAnalytics={advancedAnalytics}
              orders={orders}
              statusTags={statusTags}
            />
          )}

          {activeTab === 'customers' && (
            <AdminCustomersTab BACKEND_URL={BACKEND_URL} />
          )}

          {activeTab === 'coupons' && (
            <AdminCouponsTab BACKEND_URL={BACKEND_URL} />
          )}

          {activeTab === 'orders' && (
            <AdminOrdersTab
              orders={orders}
              products={products}
              searchTerm={searchTerm}
              orderFilter={orderFilter}
              setOrderFilter={setOrderFilter}
              localSearchTerm={localSearchTerm}
              setLocalSearchTerm={setLocalSearchTerm}
              updateStatus={updateStatus}
              setPrintingOrder={setPrintingOrder}
              statusTags={statusTags}
              trackingNumbers={trackingNumbers}
              setTrackingNumbers={setTrackingNumbers}
            />
          )}

          {activeTab === 'products' && (
            <AdminProductsTab
              products={products}
              categories={categories}
              productSearchTerm={productSearchTerm}
              localProductSearchTerm={localProductSearchTerm}
              setLocalProductSearchTerm={setLocalProductSearchTerm}
              setIsAddingProduct={setIsAddingProduct}
              setEditingProduct={setEditingProduct}
              setEditFormData={setEditFormData}
              visibleProductLimit={visibleProductLimit}
              setVisibleProductLimit={setVisibleProductLimit}
              handleDeleteProduct={handleDeleteProduct}
              onScanBrokenImages={handleScanBrokenImages}
            />
          )}

          {activeTab === 'broadcast' && (
            <AdminBroadcastTab
              broadcastImage={broadcastImage}
              broadcastMsg={broadcastMsg}
              setBroadcastMsg={setBroadcastMsg}
              isBroadcasting={isBroadcasting}
              handleBroadcast={handleBroadcast}
              handleBroadcastUpload={handleBroadcastUpload}
              setBroadcastImage={setBroadcastImage}
            />
          )}

          {activeTab === 'faqs' && (
            <AdminFaqsTab
              faqsLoading={faqsLoading}
              faqsList={faqsList}
              setEditingFaq={setEditingFaq}
              setIsFaqModalOpen={setIsFaqModalOpen}
              handleDeleteFaq={handleDeleteFaq}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsTab
              shopStatus={shopStatus}
              showConfirm={showConfirm}
              setShopStatus={setShopStatus}
              updateSettingValue={updateSettingValue}
              deliveryFee={deliveryFee}
              setDeliveryFee={setDeliveryFee}
              deliveryThreshold={deliveryThreshold}
              setDeliveryThreshold={setDeliveryThreshold}
              promoBannerUrl={promoBannerUrl}
              removeBanner={removeBanner}
              handleBannerUpload={handleBannerUpload}
              updateBannerProduct={updateBannerProduct}
              products={products}
              categories={categories}
              shopLogoUrl={shopLogoUrl}
              handleLogoUpload={handleLogoUpload}
              paymentQrUrl={paymentQrUrl}
              handleQrUpload={handleQrUpload}
              paymentInfo={paymentInfo}
              setPaymentInfo={setPaymentInfo}
              receiptShopName={receiptShopName}
              setReceiptShopName={setReceiptShopName}
              receiptSubtitle={receiptSubtitle}
              setReceiptSubtitle={setReceiptSubtitle}
              receiptNote={receiptNote}
              setReceiptNote={setReceiptNote}
              socialFb={socialFb}
              setSocialFb={setSocialFb}
              socialTg={socialTg}
              setSocialTg={setSocialTg}
              socialIg={socialIg}
              setSocialIg={setSocialIg}
              socialTt={socialTt}
              setSocialTt={setSocialTt}
              socialEmail={socialEmail}
              setSocialEmail={setSocialEmail}
              socialWa={socialWa}
              setSocialWa={setSocialWa}
              shopPhone={shopPhone}
              setShopPhone={setShopPhone}
              shopAddress={shopAddress}
              setShopAddress={setShopAddress}
              shopHours={shopHours}
              setShopHours={setShopHours}
              settingsReady={Boolean(settingsData?.success && !dashboardLoading)}
            />
          )}

        </div>

        {showSuccessToast && (
          <div className="admin-toast-float">
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

            {/* ✅ Modals rendered OUTSIDE the animate-in container so position:fixed works correctly */}
      <AdminEditProductModal
        editingProduct={editingProduct}
        isUploading={isUploading}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        compressImage={compressImage}
        setIsUploading={setIsUploading}
        fetchWithRetry={fetchWithRetry}
        BACKEND_URL={BACKEND_URL}
        headers={headers}
        categories={categories}
        setEditingProduct={setEditingProduct}
        handlePreview={handlePreview}
        isSaving={isSaving}
        submitEditProduct={submitEditProduct}
      />

      <AdminAddProductModal
        isAddingProduct={isAddingProduct}
        isUploading={isUploading}
        newProductData={newProductData}
        setNewProductData={setNewProductData}
        compressImage={compressImage}
        setIsUploading={setIsUploading}
        fetchWithRetry={fetchWithRetry}
        BACKEND_URL={BACKEND_URL}
        headers={headers}
        categories={categories}
        setIsAddingProduct={setIsAddingProduct}
        handlePreview={handlePreview}
        isSaving={isSaving}
        submitAddProduct={submitAddProduct}
      />

      <AdminFaqModal
        isFaqModalOpen={isFaqModalOpen}
        editingFaq={editingFaq}
        setEditingFaq={setEditingFaq}
        setIsFaqModalOpen={setIsFaqModalOpen}
        handleSaveFaq={handleSaveFaq}
      />

      {isPreviewing && previewData && (
        <ProductDetail
          product={previewData}
          onClose={() => setIsPreviewing(false)}
          onAdd={() => showAlert('នេះគ្រាន់តែជារូបភាព Preview!')}
          lang={tg?.language_code === 'kh' ? 'kh' : 'en'}
          isFavorited={previewFavorited}
          onToggleWishlist={() => setPreviewFavorited(!previewFavorited)}
        />
      )}

      {confirmDialog && (
        <BeautyModal
          text={confirmDialog.text}
          icon={confirmDialog.icon}
          isAlert={confirmDialog.isAlert}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </>
  );
};

const BeautyModal = ({ text, icon, isAlert, onConfirm, onCancel }) => (
  <div className="modal-overlay" style={{ zIndex: 9999, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)' }}>
    <div className="beauty-modal-card" style={{ background: 'var(--bg-surface, #1e1e24)', border: '1px solid var(--border-color, rgba(255,255,255,0.15))', padding: '30px 24px', borderRadius: 28 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon || (isAlert ? '✨' : '🗑️')}</div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 26, lineHeight: 1.6, color: 'var(--text-bold, #ffffff)' }}>{text}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {!isAlert && (
          <button
            className="nav-pill-btn"
            style={{ flex: 1, minHeight: 46, borderRadius: 14, background: 'var(--bg-soft, rgba(255,255,255,0.1))', color: 'var(--text-bold, #ffffff)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
            onClick={onCancel}
          >
            បោះបង់
          </button>
        )}
        <button
          className="detail-btn-buy-luxury"
          style={{ flex: 1.2, minHeight: 46, borderRadius: 14, background: isAlert ? 'var(--primary-accent, #10b981)' : '#ef4444', color: '#ffffff', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer', boxShadow: isAlert ? '0 4px 14px rgba(16,185,129,0.3)' : '0 4px 14px rgba(239,68,68,0.3)' }}
          onClick={onConfirm}
        >
          {isAlert ? 'យល់ព្រម' : 'លុប'}
        </button>
      </div>
    </div>
  </div>
);

const PrintableOrder = ({ order, shopName, subtitle, shopNote }) => {
  if (!order) return null;
  const items = JSON.parse(order.items || '[]');
  return (
    <div className="printable-order">
      <div className="print-header">
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 950 }}>{shopName || 'MARUN MINI STORE'}</h2>
        <p style={{ margin: '5px 0', fontSize: 14 }}>{subtitle || 'អីវ៉ាន់បោះដុំ និងរាយ'}</p>
      </div>
      <div className="print-divider"></div>
      <div className="print-section">
        <div className="print-row"><span>លេខវិក្កយបត្រ:</span> <strong>{order.order_code || order.id}</strong></div>
        <div className="print-row"><span>អតិថិជន:</span> <strong>{order.user_name}</strong></div>
        <div className="print-row"><span>លេខទូរស័ព្ទ:</span> <strong>{order.phone}</strong></div>
        {order.address && <div className="print-row"><span>ទីតាំង:</span> <strong>{formatFullAddress(order.address, order.province)}</strong></div>}
        {order.delivery_company && <div className="print-row"><span>ក្រុមហ៊ុនដឹក:</span> <strong style={{ textTransform: 'uppercase' }}>{order.delivery_company}</strong></div>}
        {order.note && <div className="print-row"><span>ចំណាំ:</span> <strong>{order.note}</strong></div>}
      </div>
      <div className="print-divider"></div>
      <table className="print-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th align="left" style={{ width: '55%' }}>ឈ្មោះទំនិញ</th>
            <th align="center" style={{ width: '15%' }}>ចំនួន</th>
            <th align="right" style={{ width: '30%' }}>តម្លៃ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ fontSize: '11px', fontWeight: 'bold', wordWrap: 'break-word', whiteSpace: 'normal', paddingRight: '5px' }}>{item.name}</td>
              <td align="center">x{item.quantity}</td>
              <td align="right">${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="print-divider"></div>
      <div className="print-total"><span>សរុបរួម:</span> <span style={{ fontSize: 20, fontWeight: 950 }}>${parseFloat(order.total).toFixed(2)}</span></div>
      {shopNote && (
        <>
          <div className="print-divider" style={{ borderStyle: 'dashed', marginTop: 15 }}></div>
          <div style={{ textAlign: 'center', fontSize: 12, marginTop: 15, fontWeight: 800, opacity: 0.8, whiteSpace: 'pre-line' }}>
            {shopNote}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
