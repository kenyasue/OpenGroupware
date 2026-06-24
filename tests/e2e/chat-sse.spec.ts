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

test.describe('chat (SSE realtime)', () => {
  test('a message sent in one context is received in another via SSE', async ({
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

    // メンバーをプロジェクトに追加(オーナーセッション)
    const addRes = await ownerPage.request.post(
      `/api/projects/${projectId}/members`,
      { data: { email: memberEmail, role: 'member' } }
    );
    expect(addRes.ok()).toBeTruthy();

    // 両者チャット画面を開く(SSE接続)
    await ownerPage.goto(`/projects/${projectId}/chat`);
    await memberPage.goto(`/projects/${projectId}/chat`);
    await expect(ownerPage.getByTestId('chat-form')).toBeVisible();
    await expect(memberPage.getByTestId('chat-form')).toBeVisible();

    // オーナーがメッセージ送信
    const text = unique('hello');
    await ownerPage.getByTestId('chat-input').fill(text);
    await ownerPage.getByTestId('chat-send').click();

    // メンバー側にSSE経由でリアルタイム表示される
    await expect(
      memberPage.getByTestId('chat-messages').getByText(text)
    ).toBeVisible({ timeout: 15_000 });
    // オーナー自身にも表示される
    await expect(
      ownerPage.getByTestId('chat-messages').getByText(text)
    ).toBeVisible();

    await ownerContext.close();
    await memberContext.close();
  });
});
