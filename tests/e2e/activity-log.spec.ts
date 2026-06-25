import { test, expect } from '@playwright/test';

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function setupOwner(page: import('@playwright/test').Page) {
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

test.describe('activity log', () => {
  test('board post and todo creation are recorded in the project activity log', async ({
    page,
  }) => {
    const projectId = await setupOwner(page);

    // 掲示板投稿 → board_posted アクティビティ
    await page.request.post(`/api/projects/${projectId}/board/threads`, {
      data: { title: unique('Thread'), bodyMd: 'body', category: 'notice' },
    });
    // ToDo作成 → todo_created アクティビティ
    const cols = (
      (await (
        await page.request.get(`/api/projects/${projectId}/todos/columns`)
      ).json()) as {
        columns: { id: number }[];
      }
    ).columns;
    await page.request.post(`/api/projects/${projectId}/todos/items`, {
      data: { title: unique('Task'), columnId: cols[0].id },
    });

    // アクティビティ画面に両方のアクションが記録されている
    await page.goto(`/projects/${projectId}/activity`);
    await expect(page.getByText('掲示板投稿')).toBeVisible();
    await expect(page.getByText('ToDo作成')).toBeVisible();
  });
});
