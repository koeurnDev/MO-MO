import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import translations from '../translations.json';
import { useTelegram } from './TelegramContext';

const UserStateContext = createContext(null);
const UserDispatchContext = createContext(null);

export const UserProvider = ({ children }) => {
  const { tg } = useTelegram();
  const [user, setUser] = useState(() => {
    if (tg?.initDataUnsafe?.user) return tg.initDataUnsafe.user;
    
    // 🧪 Principal: Dev/Guest Mode Mock
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    return isDev ? {
      id: 7817470099,
      first_name: 'Guest',
      last_name: 'Admin',
      username: 'guest_admin',
      language_code: 'en'
    } : null;
  });
  const [lang, setLang] = useState(() => localStorage.getItem('momo_lang') || 'kh');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('momo_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // 🛡️ RBAC Monitoring: Automatic Role Detection
  useEffect(() => {
    if (user?.id === 7817470099) {
      console.log('👑 Admin Access Granted to:', user.first_name);
      setIsSuperAdmin(true);
    } else {
      setIsSuperAdmin(false);
    }
  }, [user]);

  // Translation helper (Memoized to prevent unnecessary downstream re-renders)
  const t = useCallback((key) => {
    return translations[lang]?.[key] || key;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'kh' ? 'en' : 'kh';
      localStorage.setItem('momo_lang', next);
      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
      return next;
    });
  }, [tg]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = (prev === 'light' ? 'dark' : 'light');
      localStorage.setItem('momo_theme', next);
      document.documentElement.setAttribute('data-theme', next);
      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
      
      // Sync with Telegram core UI (Using strictly validated Hex strings)
      const headerColor = next === 'dark' ? '#0f172a' : '#ff72a0';
      const bgColor = next === 'dark' ? '#020617' : '#fff8f9';
      
      if (tg?.isVersionAtLeast?.('6.1')) {
        if (tg.setHeaderColor) tg.setHeaderColor(headerColor);
        if (tg.setBackgroundColor) tg.setBackgroundColor(bgColor);
      }
      
      return next;
    });
  }, [tg]);

  useEffect(() => {
    if (tg) {
      // 🛡️ Sanitize: Ensure we only accept 'light' or 'dark'
      const savedTheme = localStorage.getItem('momo_theme');
      const tgScheme = tg.colorScheme;
      const finalTheme = (savedTheme === 'light' || savedTheme === 'dark') 
        ? savedTheme 
        : (tgScheme === 'dark' ? 'dark' : 'light');

      setTheme(finalTheme);
      document.documentElement.setAttribute('data-theme', finalTheme);
      
      // Initial Sync
      const hColor = finalTheme === 'dark' ? '#0f172a' : '#ff72a0';
      const bColor = finalTheme === 'dark' ? '#020617' : '#fff8f9';
      if (tg?.isVersionAtLeast?.('6.1')) {
        if (tg.setHeaderColor) tg.setHeaderColor(hColor);
        if (tg.setBackgroundColor) tg.setBackgroundColor(bColor);
      }
      
      const savedLang = localStorage.getItem('momo_lang');
      if (!savedLang) {
        const tgLang = tg.initDataUnsafe?.user?.language_code;
        setLang(tgLang === 'km' ? 'kh' : 'en');
      }

      // 🛡️ Principal: Protect mock user from overwriting if no TG user found
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }
    }
  }, [tg]);

  const state = useMemo(() => ({
    user,
    lang,
    theme,
    isSuperAdmin,
    t
  }), [user, lang, theme, isSuperAdmin, t]);

  const dispatch = useMemo(() => ({
    setUser,
    setLang,
    toggleTheme,
    toggleLang,
    setIsSuperAdmin
  }), [toggleTheme, toggleLang]);

  return (
    <UserStateContext.Provider value={state}>
      <UserDispatchContext.Provider value={dispatch}>
        {children}
      </UserDispatchContext.Provider>
    </UserStateContext.Provider>
  );
};

export const useUser = () => {
  const state = useContext(UserStateContext);
  const dispatch = useContext(UserDispatchContext);
  if (!state || !dispatch) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return { ...state, ...dispatch };
};

export const useUserState = () => useContext(UserStateContext);
export const useUserDispatch = () => useContext(UserDispatchContext);
