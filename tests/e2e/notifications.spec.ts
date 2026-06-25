import { test, expect, type Page } from '@playwright/test';

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function registerAndLogin(page: Page, email: string, name: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: '新規登録はこちら' }).click();
  await page.getByLabel('表示名').fill(name);
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123');
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('notifications', () => {
  test('member-added notification appears and can be marked read', async ({
    browser,
  }) => {
    const ownerEmail = unique('owner') + '@example.com';
    const memberEmail = unique('member') + '@example.com';

    // メンバーを先に登録(UIで作成+ログイン)
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await registerAndLogin(memberPage, memberEmail, 'Member');

    // オーナー登録＋プロジェクト作成
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await registerAndLogin(ownerPage, ownerEmail, 'Owner');
    await ownerPage.getByLabel('プロジェクト名').fill(unique('Proj'));
    await ownerPage.getByRole('button', { name: '新規プロジェクト' }).click();
    await expect(ownerPage).toHaveURL(/\/projects\/\d+$/);
    const projectId = Number(ownerPage.url().match(/\/projects\/(\d+)/)![1]);

    // メンバー追加 → project_added 通知がメンバーへ
    const addRes = await ownerPage.request.post(
      `/api/projects/${projectId}/members`,
      { data: { email: memberEmail, role: 'member' } }
    );
    expect(addRes.ok()).toBeTruthy();

    // メンバーの通知一覧に表示
    await memberPage.goto('/notifications');
    await expect(
      memberPage.getByText('プロジェクトに追加されました')
    ).toBeVisible();

    // 既読化(API) → 一覧が空になる
    const listRes = await memberPage.request.get('/api/notifications?page=1');
    const { items } = (await listRes.json()) as {
      items: { id: number }[];
    };
    expect(items).toHaveLength(1);
    const readRes = await memberPage.request.post(
      `/api/notifications/${items[0].id}/read`
    );
    expect(readRes.ok()).toBeTruthy();
    await memberPage.reload();
    await expect(
      memberPage.getByText('未読の通知はありません。')
    ).toBeVisible();

    await ownerContext.close();
    await memberContext.close();
  });
});
