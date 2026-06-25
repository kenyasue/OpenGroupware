import { cookies } from 'next/headers';
import { dictionary, type MessageKey } from './dictionary';
import type { Locale, Theme } from '@/lib/types';

/** サーバー側で locale Cookie を読み解決する(既定 en)。 */
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  return c.get('locale')?.value === 'ja' ? 'ja' : 'en';
}

/** サーバー側で theme Cookie を読み解決する(既定 dark)。 */
export async function getTheme(): Promise<Theme> {
  const c = await cookies();
  return c.get('theme')?.value === 'light' ? 'light' : 'dark';
}

/** サーバー側で翻訳文字列を取得する。 */
export function translate(key: MessageKey, locale: Locale): string {
  return dictionary[locale][key] ?? dictionary.en[key] ?? key;
}
