import { test, expect } from '@playwright/test';

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;
}

test.describe('authentication', () => {
  test('register lands on the dashboard, then profile and logout', async ({
    page,
  }) => {
    const email = uniqueEmail();

    await page.goto('/login');
    await page.getByRole('button', { name: '新規登録はこちら' }).click();
    await page.getByLabel('表示名').fill('E2E User');
    await page.getByLabel('メールアドレス').fill(email);
    await page.getByLabel('パスワード').fill('password123');
    await page.getByRole('button', { name: '登録する' }).click();

    // 登録と同時にログイン → ダッシュボードへ
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole('heading', { name: 'ダッシュボード' })
    ).toBeVisible();

    // プロフィールへ移動しログアウト
    await page.getByRole('link', { name: /さん/ }).click();
    await expect(page).toHaveURL(/\/profile/);
    await page.getByRole('button', { name: 'ログアウト' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with a pre-registered account', async ({ page, request }) => {
    const email = uniqueEmail();
    await request.post('/api/auth/register', {
      data: { name: 'Pre User', email, password: 'password123' },
    });

    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(email);
    await page.getByLabel('パスワード').fill('password123');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('wrong password shows an error and stays on login', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();
    await request.post('/api/auth/register', {
      data: { name: 'Pre User', email, password: 'password123' },
    });

    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(email);
    await page.getByLabel('パスワード').fill('wrong-password');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to a protected page redirects to login', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });

  test('unauthenticated API request returns 401', async ({ request }) => {
    const res = await request.get('/api/auth/me');
    expect(res.status()).toBe(401);
  });
});
