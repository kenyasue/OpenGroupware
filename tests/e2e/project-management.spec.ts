import { test, expect } from '@playwright/test';

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function registerAndLogin(
  page: import('@playwright/test').Page,
  email: string
) {
  await page.goto('/login');
  await page.getByRole('button', { name: '新規登録はこちら' }).click();
  await page.getByLabel('表示名').fill('Owner');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123');
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

function extractProjectId(url: string): number {
  const match = url.match(/\/projects\/(\d+)/);
  if (!match) throw new Error(`project id not found in ${url}`);
  return Number(match[1]);
}

test.describe('project management', () => {
  test('create a project, add and remove a member, then archive', async ({
    page,
    request,
  }) => {
    const ownerEmail = unique('owner') + '@example.com';
    const memberEmail = unique('member') + '@example.com';
    const projectName = unique('Project');

    // オーナー登録＋ログイン
    await registerAndLogin(page, ownerEmail);

    // プロジェクト作成(UI)
    await page.getByLabel('プロジェクト名').fill(projectName);
    await page.getByRole('button', { name: '新規プロジェクト' }).click();
    await expect(page).toHaveURL(/\/projects\/\d+$/);
    await expect(
      page.getByRole('heading', { name: projectName })
    ).toBeVisible();
    const projectId = extractProjectId(page.url());

    // 追加用メンバーを事前登録
    await request.post('/api/auth/register', {
      data: {
        name: 'Member User',
        email: memberEmail,
        password: 'password123',
      },
    });

    // メンバー追加(オーナーのセッションでAPI呼び出し)
    const addRes = await page.request.post(
      `/api/projects/${projectId}/members`,
      { data: { email: memberEmail, role: 'member' } }
    );
    expect(addRes.ok()).toBeTruthy();
    const { member } = (await addRes.json()) as {
      member: { userId: number };
    };

    // メンバー一覧画面に反映されているか検証(UI)
    await page.goto(`/projects/${projectId}/members`);
    await expect(page.getByText('Member User')).toBeVisible();

    // メンバー削除(API) → 一覧から消えるか検証(UI)
    const delRes = await page.request.delete(
      `/api/projects/${projectId}/members/${member.userId}`
    );
    expect(delRes.ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByText('Member User')).toHaveCount(0);

    // アーカイブ(API) → 概要画面に反映されているか検証(UI)
    const archiveRes = await page.request.patch(`/api/projects/${projectId}`, {
      data: { status: 'archived' },
    });
    expect(archiveRes.ok()).toBeTruthy();
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByText('Archived')).toBeVisible();
  });

  test('non-member cannot access a project they do not belong to', async ({
    browser,
    request,
  }) => {
    const ownerEmail = unique('owner') + '@example.com';
    const outsiderEmail = unique('outsider') + '@example.com';

    // オーナーがプロジェクトを作成
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await registerAndLogin(ownerPage, ownerEmail);
    await ownerPage.getByLabel('プロジェクト名').fill(unique('Secret'));
    await ownerPage.getByRole('button', { name: '新規プロジェクト' }).click();
    const projectUrl = ownerPage.url();

    // 外部ユーザーは登録のみ（プロジェクト非参加）
    await request.post('/api/auth/register', {
      data: {
        name: 'Outsider',
        email: outsiderEmail,
        password: 'password123',
      },
    });
    const outsiderContext = await browser.newContext();
    const outsiderPage = await outsiderContext.newPage();
    await outsiderPage.goto('/login');
    await outsiderPage.getByLabel('メールアドレス').fill(outsiderEmail);
    await outsiderPage.getByLabel('パスワード').fill('password123');
    await outsiderPage.getByRole('button', { name: 'ログイン' }).click();
    await expect(outsiderPage).toHaveURL(/\/dashboard/);

    // プロジェクト詳細へ直接アクセス → ダッシュボードへリダイレクト
    await outsiderPage.goto(projectUrl);
    await expect(outsiderPage).toHaveURL(/\/dashboard$/);

    await ownerContext.close();
    await outsiderContext.close();
  });
});
