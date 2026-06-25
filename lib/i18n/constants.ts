import type { Locale, Theme } from '@/lib/types';

/** テーマ/言語のプリフ Cookie の有効期限(1年)。 */
export const PREF_MAX_AGE = 60 * 60 * 24 * 365;

/** 許容されるテーマ。 */
export const VALID_THEMES: Theme[] = ['dark', 'light'];

/** 許容される言語。 */
export const VALID_LOCALES: Locale[] = ['en', 'ja'];
