import { useEffect, useCallback, useRef } from 'react';
import { useTelegram } from '../context/TelegramContext';

const TELEMETRY_URL = `${import.meta.env.VITE_BACKEND_URL}/api/events`;

export const useTelemetry = () => {
  const { tg } = useTelegram();

  const sendTelemetry = useCallback(async (data) => {
    try {
      const payload = {
        ...data,
        timestamp: new Date().toISOString(),
        userId: tg?.initDataUnsafe?.user?.id || 'anonymous',
        device: tg?.platform || 'unknown',
        version: tg?.version || 'unknown'
      };

      // Use sendBeacon for more reliable delivery on page exit
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(TELEMETRY_URL, blob);
      } else {
        fetch(TELEMETRY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {});
      }
    } catch (e) { /* Fail silently */ }
  }, [tg]);

  const hasReportedInit = useRef(false);
  
  useEffect(() => {
    if (hasReportedInit.current) return;
    hasReportedInit.current = true;

    // 📈 Report Core Web Vitals
    if ('performance' in window && 'getEntriesByType' in performance) {
      const paint = performance.getEntriesByType('paint');
      if (paint.length > 0) {
        sendTelemetry({ type: 'PERF_PAINT', data: paint });
      }
    }

    // 🚨 Report Errors
    const handleError = (event) => {
      sendTelemetry({
        type: 'JS_ERROR',
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [sendTelemetry]);

  return { sendTelemetry };
};
