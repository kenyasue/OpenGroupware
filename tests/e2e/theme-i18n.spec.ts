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

test.describe('theme & i18n', () => {
  test('a fresh visitor gets English locale and dark theme by default', async ({
    browser,
  }) => {
    // storageState を持たない = 初回訪問者(既定 en / dark)
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    const className = await page.evaluate(
      () => document.documentElement.className
    );
    expect(className).toContain('dark');
    await ctx.close();
  });

  test('theme toggle switches dark<->light and persists', async ({ page }) => {
    await setupOwner(page);
    // 既定は dark
    expect(
      await page.evaluate(() => document.documentElement.className)
    ).toContain('dark');

    await page.getByTestId('theme-toggle').click();
    expect(
      await page.evaluate(() => document.documentElement.className)
    ).not.toContain('dark');

    // リロード後もライトが維持される(Cookie永続化)
    await page.reload();
    expect(
      await page.evaluate(() => document.documentElement.className)
    ).not.toContain('dark');
  });

  test('language switch ja -> en updates chrome and persists', async ({
    page,
  }) => {
    const projectId = await setupOwner(page);
    await page.goto(`/projects/${projectId}`);
    // E2E既定は ja → ヘッダーに ダッシュボード
    await expect(
      page.getByRole('link', { name: 'ダッシュボード' })
    ).toBeVisible();

    // プロフィールで en に切替
    await page.goto('/profile');
    await page.getByTestId('profile-locale-select').selectOption('en');

    // クロムが英語に切替
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });
});
