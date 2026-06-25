'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { dictionary, type MessageKey } from '@/lib/i18n/dictionary';
import { PREF_MAX_AGE } from '@/lib/i18n/constants';
import type { Locale, Theme } from '@/lib/types';

interface I18nContextValue {
  locale: Locale;
  theme: Theme;
  t: (key: MessageKey) => string;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => Promise<void>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * 言語とテーマのクライアント状態を提供するコンテキスト。
 * - locale: 辞書の切り替え(t)と <html lang> の更新
 * - setLocale/setTheme: Cookie を即時設定し /api/users/me で永続化、router.refresh でSSR再描画
 */
export function I18nProvider({
  initialLocale,
  initialTheme,
  children,
}: {
  initialLocale: Locale;
  initialTheme: Theme;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const t = useCallback(
    (key: MessageKey) => dictionary[locale][key] ?? dictionary.en[key] ?? key,
    [locale]
  );

  const persist = useCallback(async (body: Record<string, unknown>) => {
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      // 永続化失敗時もローカルCookieで動作継続するが、ログは残す
      console.warn('Failed to persist user prefs:', error);
    }
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      document.cookie = `locale=${next}; path=/; max-age=${PREF_MAX_AGE}; samesite=lax`;
      void persist({ locale: next });
      router.refresh();
    },
    [persist, router]
  );

  const setTheme = useCallback(
    async (next: Theme) => {
      setThemeState(next);
      const root = document.documentElement;
      if (next === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
      root.style.colorScheme = next;
      document.cookie = `theme=${next}; path=/; max-age=${PREF_MAX_AGE}; samesite=lax`;
      await persist({ theme: next });
    },
    [persist]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, theme, t, setLocale, setTheme }),
    [locale, theme, t, setLocale, setTheme]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
