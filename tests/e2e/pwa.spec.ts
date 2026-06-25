import { test, expect, type Page } from '@playwright/test';

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function setupOwner(page: Page): Promise<number> {
  const email = unique('owner') + '@example.com';
  await page.goto('/login');
  await page.getByRole('button', { name: '新規登録はこちら' }).click();
  await page.getByLabel('表示名').fill('Owner');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123');
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByLabel('プロジェクト名').fill(unique('Proj'));
  await page.getByRole('button', { name: '新規プロジェクト' }).click();
  await expect(page).toHaveURL(/\/projects\/\d+$/);
  return Number(page.url().match(/\/projects\/(\d+)/)![1]);
}

test.describe('pwa', () => {
  test('manifest, service worker and icons are publicly served', async ({
    request,
  }) => {
    const manifestRes = await request.get('/manifest.webmanifest');
    expect(manifestRes.ok()).toBeTruthy();
    const manifest = (await manifestRes.json()) as {
      name: string;
      short_name: string;
      display: string;
      start_url: string;
      icons: { sizes: string; type: string; purpose?: string }[];
    };
    expect(manifest.name).toBe('Groupware');
    expect(manifest.short_name).toBe('Groupware');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(manifest.icons.some((i) => i.sizes === '192x192')).toBeTruthy();
    expect(manifest.icons.some((i) => i.sizes === '512x512')).toBeTruthy();
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBeTruthy();

    const swRes = await request.get('/sw.js');
    expect(swRes.ok()).toBeTruthy();
    const swText = await swRes.text();
    expect(swText).toContain('fetch');
    expect(swText).toContain('install');

    expect((await request.get('/icon-192.png')).ok()).toBeTruthy();
    expect((await request.get('/icon-512.png')).ok()).toBeTruthy();
    expect((await request.get('/icon.svg')).ok()).toBeTruthy();
  });

  test('project nav scrolls horizontally on mobile width (no wrap)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/locale-ja.json',
      viewport: { width: 375, height: 812 },
    });
    const page = await ctx.newPage();
    await setupOwner(page);

    const nav = page.getByTestId('project-nav');
    await expect(nav).toBeVisible();
    const scrollable = await nav.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    // ナビ項目が多数あるため、375px では横スクロールが発生する(折り返さない)
    expect(scrollable.scrollWidth).toBeGreaterThan(scrollable.clientWidth);
    await ctx.close();
  });
});
