import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const TelegramContext = createContext(null);

export const TelegramProvider = ({ children }) => {
  const [tg, setTg] = useState(null);

  useEffect(() => {
    const webapp = window.Telegram?.WebApp;
    if (webapp) {
      webapp.ready();
      webapp.expand();
      setTg(webapp);
    }
  }, []);

  const value = useMemo(() => ({
    tg,
    user: tg?.initDataUnsafe?.user,
    initData: tg?.initData,
    isExpanded: tg?.isExpanded,
    colorScheme: tg?.colorScheme,
    version: tg?.version,
    headerColor: tg?.headerColor,
    backgroundColor: tg?.backgroundColor,
    BackButton: tg?.BackButton,
    MainButton: tg?.MainButton,
    HapticFeedback: {
      impactOccurred: (style) => {
        if (tg?.isVersionAtLeast?.('6.1')) tg.HapticFeedback.impactOccurred(style);
      },
      notificationOccurred: (type) => {
        if (tg?.isVersionAtLeast?.('6.1')) tg.HapticFeedback.notificationOccurred(type);
      },
      selectionChanged: () => {
        if (tg?.isVersionAtLeast?.('6.1')) tg.HapticFeedback.selectionChanged();
      }
    },
    showPopup: (params) => {
      if (tg?.isVersionAtLeast?.('6.2')) {
        tg.showPopup(params);
      } else {
        alert(params.message);
      }
    },
    showAlert: (message) => {
      if (tg?.isVersionAtLeast?.('6.2')) {
        tg.showAlert(message);
      } else {
        alert(message);
      }
    },
    showConfirm: (message, callback) => {
      if (tg?.isVersionAtLeast?.('6.2')) {
        tg.showConfirm(message, callback);
      } else {
        const ok = window.confirm(message);
        if (callback) callback(ok);
      }
    },
    switchInlineQuery: (query, chat_types = []) => {
      if (tg?.isVersionAtLeast?.('6.7')) {
        tg.switchInlineQuery(query, chat_types);
      } else {
        alert(query + "\n\n(Share feature requires a newer Telegram version)");
      }
    },
    sendData: tg?.sendData,
    close: tg?.close,
    setHeaderColor: (color) => tg?.setHeaderColor?.(color),
    setBackgroundColor: (color) => tg?.setBackgroundColor?.(color),
    isVersionAtLeast: (version) => tg?.isVersionAtLeast?.(version) || false,
  }), [tg]);

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};
