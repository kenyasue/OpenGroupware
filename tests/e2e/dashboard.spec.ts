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

test.describe('dashboard & search', () => {
  test('personal dashboard, project dashboard, and search', async ({
    page,
  }) => {
    const projectId = await setupOwner(page);
    const keyword = unique('unicorn');

    // データ作成: 掲示板スレッド + ToDo
    await page.request.post(`/api/projects/${projectId}/board/threads`, {
      data: { title: `thread ${keyword}`, bodyMd: 'body', category: 'notice' },
    });
    const cols = (
      (await (
        await page.request.get(`/api/projects/${projectId}/todos/columns`)
      ).json()) as {
        columns: { id: number }[];
      }
    ).columns;
    await page.request.post(`/api/projects/${projectId}/todos/items`, {
      data: {
        title: `task ${keyword}`,
        columnId: cols[0].id,
        assigneeId: undefined,
      },
    });
    // 自分(owner)のIDを取得してToDo担当にする
    const me = (await (await page.request.get('/api/auth/me')).json()) as {
      user: { id: number };
    };
    const items = (
      (await (
        await page.request.get(`/api/projects/${projectId}/todos/items`)
      ).json()) as {
        items: { id: number; title: string }[];
      }
    ).items;
    const taskId = items.find((i) => i.title.includes(keyword))!.id;
    await page.request.patch(
      `/api/projects/${projectId}/todos/items/${taskId}`,
      {
        data: { assigneeId: me.user.id },
      }
    );

    // 個人ダッシュボード: プロジェクト + 未完了ToDo
    await page.goto('/dashboard');
    await expect(page.getByText(unique('Proj').split('-')[0])).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(`task ${keyword}`)).toBeVisible();

    // プロジェクトダッシュボード: 進行中ToDo + 最新掲示板
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByText(`task ${keyword}`)).toBeVisible();
    await expect(page.getByText(`thread ${keyword}`)).toBeVisible();

    // 検索
    await page.goto(
      `/projects/${projectId}/search?q=${encodeURIComponent(keyword)}`
    );
    await expect(page.getByText(`thread ${keyword}`)).toBeVisible();
    await expect(page.getByText(`task ${keyword}`)).toBeVisible();
  });
});
