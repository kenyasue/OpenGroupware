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

test.describe('calendar & milestones', () => {
  test('milestone progress reflects related todo completion; calendar aggregates', async ({
    page,
  }) => {
    const projectId = await setupOwner(page);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const midMonth = `${y}-${m}-15`;

    // マイルストーン作成
    const msRes = await page.request.post(
      `/api/projects/${projectId}/milestones`,
      { data: { title: unique('MS'), dueDate: midMonth } }
    );
    expect(msRes.ok()).toBeTruthy();
    const { milestone } = (await msRes.json()) as { milestone: { id: number } };

    // ToDoを作成しマイルストーンに紐付け
    const cols = (
      (await (
        await page.request.get(`/api/projects/${projectId}/todos/columns`)
      ).json()) as {
        columns: { id: number }[];
      }
    ).columns;
    const itemRes = await page.request.post(
      `/api/projects/${projectId}/todos/items`,
      {
        data: { title: 'linked task', columnId: cols[0].id, dueDate: midMonth },
      }
    );
    const { item } = (await itemRes.json()) as { item: { id: number } };
    await page.request.patch(
      `/api/projects/${projectId}/todos/items/${item.id}`,
      {
        data: { milestoneId: milestone.id },
      }
    );

    // マイルストーン画面: 進捗 0%
    await page.goto(`/projects/${projectId}/milestones`);
    await expect(page.getByTestId(`milestone-${milestone.id}`)).toBeVisible();
    await expect(
      page.getByTestId(`milestone-progress-${milestone.id}`)
    ).toHaveText('0%');

    // ToDo完了 → 進捗 100%
    await page.request.patch(
      `/api/projects/${projectId}/todos/items/${item.id}`,
      {
        data: { toggleComplete: true },
      }
    );
    await page.reload();
    await expect(
      page.getByTestId(`milestone-progress-${milestone.id}`)
    ).toHaveText('100%');

    // カレンダーイベント作成
    const evRes = await page.request.post(
      `/api/projects/${projectId}/calendar/events`,
      {
        data: {
          title: unique('Event'),
          type: 'custom',
          startAt: `${midMonth}T10:00:00`,
        },
      }
    );
    expect(evRes.ok()).toBeTruthy();

    // カレンダー画面にイベント+マイルストーン+ToDoが集約表示される
    await page.goto(`/projects/${projectId}/calendar`);
    await expect(page.getByText(/マイルストーン:/)).toBeVisible();
    await expect(page.getByText(/ToDo:/)).toBeVisible();
  });
});
