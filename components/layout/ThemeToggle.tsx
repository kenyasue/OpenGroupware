'use client';

import { useI18n } from '@/lib/i18n/I18nProvider';

/**
 * ヘッダー等に置くテーマ切替ボタン。
 * クリックで dark/light を即時切替(Cookie + ユーザー設定へ永続化)。
 */
export function ThemeToggle() {
  const { theme, setTheme } = useI18n();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => void setTheme(next)}
      aria-label={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
      data-testid="theme-toggle"
      className="rounded px-2 py-1 text-sm text-gray-600 hover:underline dark:text-gray-300"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
