import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('backup & admin', () => {
  test('admin creates, lists, and downloads a backup; non-admin is forbidden', async ({
    browser,
    request,
  }) => {
    // 管理者(globalSetup で seed 済み)でログイン
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, 'admin@example.com', 'admin123');

    // バックアップ一覧画面
    await adminPage.goto('/admin/backups');
    await expect(
      adminPage.getByRole('heading', { name: '管理者: バックアップ' })
    ).toBeVisible();

    // バックアップ作成(API)
    const createRes = await adminPage.request.post('/api/admin/backups');
    expect(createRes.ok()).toBeTruthy();
    const { backup } = (await createRes.json()) as {
      backup: { filename: string };
    };

    // 一覧に表示
    await adminPage.reload();
    await expect(
      adminPage.getByTestId(`backup-${backup.filename}`)
    ).toBeVisible();

    // ダウンロード(API)
    const dlRes = await adminPage.request.get(
      `/api/admin/backups/${backup.filename}`
    );
    expect(dlRes.status()).toBe(200);
    expect(dlRes.headers()['content-type']).toContain('application/zip');

    // 非管理者は403
    const memberEmail = `member-${Date.now()}@example.com`;
    await request.post('/api/auth/register', {
      data: { name: 'Member', email: memberEmail, password: 'password123' },
    });
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await login(memberPage, memberEmail, 'password123');
    const forbidden = await memberPage.request.get('/api/admin/backups');
    expect(forbidden.status()).toBe(403);

    await adminContext.close();
    await memberContext.close();
  });
});
