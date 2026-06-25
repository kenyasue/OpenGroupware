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

  test('edit dialog shows and persists metadata + file attachments', async ({
    page,
  }) => {
    const projectId = await setupOwner(page);

    const colsRes = await page.request.get(
      `/api/projects/${projectId}/todos/columns`
    );
    const cols = (
      (await colsRes.json()) as { columns: { id: number; name: string }[] }
    ).columns;
    const backlog = cols.find((c) => c.name === 'Backlog')!;

    // オーナー(担当者候補)のuser idを取得
    const members = (
      (await (
        await page.request.get(`/api/projects/${projectId}/members`)
      ).json()) as { members: { user: { id: number; name: string } }[] }
    ).members;
    const ownerId = members[0].user.id;

    // タスク作成(API)
    const title = unique('Task');
    const createRes = await page.request.post(
      `/api/projects/${projectId}/todos/items`,
      { data: { title, columnId: backlog.id } }
    );
    const { item } = (await createRes.json()) as { item: { id: number } };

    // 添付ファイル(1x1 PNG)をアップロード
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    const upRes = await page.request.post(
      `/api/projects/${projectId}/attachments`,
      {
        multipart: {
          file: { name: 'pic.png', mimeType: 'image/png', buffer: png },
        },
      }
    );
    expect(upRes.ok()).toBeTruthy();
    const { file } = (await upRes.json()) as { file: { id: number } };

    // ダイアログを開いてメタデータを編集
    await page.goto(`/projects/${projectId}/todos`);
    await page.getByTestId(`todo-card-${item.id}`).click();
    await expect(page.getByTestId('todo-dialog')).toBeVisible();
    await page.getByTestId('todo-description').fill('detailed desc');
    await page.getByTestId('todo-tags').fill('frontend, urgent');
    await page.getByTestId('todo-start-date').fill('2026-07-01');
    await page.getByTestId('todo-due-date').fill('2026-07-31');
    await page.getByTestId('todo-assignee').selectOption(String(ownerId));
    await page.getByTestId('todo-save').click();
    await expect(page.getByTestId('todo-dialog')).toBeHidden();

    // カードにタグが表示される
    await expect(page.getByText('frontend')).toBeVisible();

    // APIでファイルを添付付け
    const attachRes = await page.request.patch(
      `/api/projects/${projectId}/todos/items/${item.id}`,
      { data: { fileIds: [file.id] } }
    );
    expect(attachRes.ok()).toBeTruthy();

    // GET でアイテム+添付が取得できる
    const getRes = await page.request.get(
      `/api/projects/${projectId}/todos/items/${item.id}`
    );
    const body = (await getRes.json()) as {
      item: {
        description: string;
        tags: string;
        startDate: string;
        dueDate: string;
        assigneeId: number;
      };
      attachments: { fileId: number }[];
    };
    expect(body.item.description).toBe('detailed desc');
    expect(body.item.tags).toBe('frontend, urgent');
    expect(body.item.startDate).toBe('2026-07-01');
    expect(body.item.dueDate).toBe('2026-07-31');
    expect(body.item.assigneeId).toBe(ownerId);
    expect(body.attachments).toHaveLength(1);

    // ダイアログ再オープンで添付画像が表示される
    await page.reload();
    await page.getByTestId(`todo-card-${item.id}`).click();
    await expect(page.getByTestId('todo-dialog')).toBeVisible();
    await expect(page.getByTestId('attachment-list')).toBeVisible();
  });
});
