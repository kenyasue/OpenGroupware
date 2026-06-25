import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { getLocale, getTheme, translate } from '@/lib/i18n/server';

const mockedCookies = vi.mocked(cookies);

function mockCookie(value: string | undefined) {
  mockedCookies.mockResolvedValue({
    get: () => (value === undefined ? undefined : { value }),
  } as never);
}

function mockCookieByName(map: Record<string, string | undefined>) {
  mockedCookies.mockResolvedValue({
    get: (name: string) =>
      map[name] === undefined ? undefined : { value: map[name] },
  } as never);
}

describe('i18n/server', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getLocale', () => {
    it('defaults to en when the cookie is absent', async () => {
      mockCookie(undefined);
      expect(await getLocale()).toBe('en');
    });
    it('returns ja when the cookie is ja', async () => {
      mockCookieByName({ locale: 'ja' });
      expect(await getLocale()).toBe('ja');
    });
    it('falls back to en for an unknown value', async () => {
      mockCookieByName({ locale: 'fr' });
      expect(await getLocale()).toBe('en');
    });
  });

  describe('getTheme', () => {
    it('defaults to dark when the cookie is absent', async () => {
      mockCookie(undefined);
      expect(await getTheme()).toBe('dark');
    });
    it('returns light when the cookie is light', async () => {
      mockCookieByName({ theme: 'light' });
      expect(await getTheme()).toBe('light');
    });
    it('falls back to dark for an unknown value', async () => {
      mockCookieByName({ theme: 'pink' });
      expect(await getTheme()).toBe('dark');
    });
  });

  describe('translate', () => {
    it('returns the localized string for each locale', () => {
      expect(translate('nav.board', 'en')).toBe('Board');
      expect(translate('nav.board', 'ja')).toBe('掲示板');
    });
    it('falls back to the english string then the key for unknown keys', () => {
      // @ts-expect-error -- nonexistent key on purpose
      expect(translate('nonexistent.key', 'en')).toBe('nonexistent.key');
    });
  });
});
