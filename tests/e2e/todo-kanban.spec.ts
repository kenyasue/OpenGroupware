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

test.describe('todo / kanban', () => {
  test('create a task, complete it, and move it to Done', async ({ page }) => {
    const projectId = await setupOwner(page);

    // 標準カラム取得
    const colsRes = await page.request.get(
      `/api/projects/${projectId}/todos/columns`
    );
    const cols = (
      (await colsRes.json()) as { columns: { id: number; name: string }[] }
    ).columns;
    const backlog = cols.find((c) => c.name === 'Backlog')!;
    const done = cols.find((c) => c.name === 'Done')!;

    // タスク作成(API)
    const title = unique('Task');
    const createRes = await page.request.post(
      `/api/projects/${projectId}/todos/items`,
      {
        data: {
          title,
          columnId: backlog.id,
          priority: 'high',
          dueDate: '2026-12-31',
        },
      }
    );
    expect(createRes.ok()).toBeTruthy();
    const { item } = (await createRes.json()) as { item: { id: number } };

    // ボードに表示される
    await page.goto(`/projects/${projectId}/todos`);
    await expect(page.getByTestId(`todo-card-${item.id}`)).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();

    // 完了(API) → リロードで取り消し線が反映される
    const completeRes = await page.request.patch(
      `/api/projects/${projectId}/todos/items/${item.id}`,
      { data: { toggleComplete: true } }
    );
    expect(completeRes.ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByTestId(`todo-card-${item.id}`)).toHaveClass(
      /line-through/
    );

    // Doneカラムへ移動(API)
    const moveRes = await page.request.patch(
      `/api/projects/${projectId}/todos/items/${item.id}`,
      { data: { columnId: done.id, orderIndex: 0 } }
    );
    expect(moveRes.ok()).toBeTruthy();
    await page.reload();
    await expect(
      page.getByTestId(`kanban-column-${done.id}`).getByText(title)
    ).toBeVisible();
  });
});
