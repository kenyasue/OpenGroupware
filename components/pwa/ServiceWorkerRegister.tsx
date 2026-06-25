'use client';

import { useEffect } from 'react';

/**
 * Service Worker を登録する(本番環境のみ)。
 * 開発環境では Next.js の HMR とSWキャッシュが衝突するため登録しない。
 * 登録失敗はPWAがプログレッシブ拡張であるため無視する。
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
