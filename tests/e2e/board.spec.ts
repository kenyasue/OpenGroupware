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

test.describe('board', () => {
  test('create thread, view detail, comment, and search', async ({ page }) => {
    const projectId = await setupOwner(page);
    const title = unique('Thread');

    // スレッド作成(API)
    const res = await page.request.post(
      `/api/projects/${projectId}/board/threads`,
      {
        data: {
          title,
          bodyMd: '# Hello\n\nthis is **markdown**',
          category: 'notice',
        },
      }
    );
    expect(res.ok()).toBeTruthy();
    const { thread } = (await res.json()) as { thread: { id: number } };

    // 一覧に表示される
    await page.goto(`/projects/${projectId}/board`);
    await expect(
      page.getByRole('link', { name: new RegExp(title) })
    ).toBeVisible();

    // 詳細: Markdown本文が表示される
    await page.goto(`/projects/${projectId}/board/${thread.id}`);
    await expect(
      page.getByRole('heading', { name: 'Hello', level: 1 })
    ).toBeVisible();
    await expect(page.getByText('markdown')).toBeVisible();

    // コメント追加(API) → 詳細に表示される
    const commentRes = await page.request.post(
      `/api/projects/${projectId}/board/threads/${thread.id}/comments`,
      { data: { bodyMd: 'first comment' } }
    );
    expect(commentRes.ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByText('first comment')).toBeVisible();

    // 検索: 別スレッドを作成し、q で絞り込める
    const otherTitle = unique('ZZZ');
    await page.request.post(`/api/projects/${projectId}/board/threads`, {
      data: { title: otherTitle, bodyMd: 'body', category: 'question' },
    });
    await page.goto(
      `/projects/${projectId}/board?q=${encodeURIComponent(otherTitle)}`
    );
    await expect(
      page.getByRole('link', { name: new RegExp(otherTitle) })
    ).toBeVisible();
    // 前のスレッドは検索結果に含まれない
    await expect(
      page.getByRole('link', { name: new RegExp(title) })
    ).toHaveCount(0);
  });

  test('thread and comment can carry file attachments', async ({ page }) => {
    const projectId = await setupOwner(page);

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

    // ファイル付きスレッド作成
    const title = unique('AttachThread');
    const res = await page.request.post(
      `/api/projects/${projectId}/board/threads`,
      { data: { title, bodyMd: 'body', fileIds: [file.id] } }
    );
    expect(res.ok()).toBeTruthy();
    const { thread } = (await res.json()) as { thread: { id: number } };

    // ファイル付きコメント
    const cRes = await page.request.post(
      `/api/projects/${projectId}/board/threads/${thread.id}/comments`,
      { data: { bodyMd: 'with file', fileIds: [file.id] } }
    );
    expect(cRes.ok()).toBeTruthy();

    // 詳細ページでスレッド・コメントの添付が表示される
    await page.goto(`/projects/${projectId}/board/${thread.id}`);
    await expect(page.getByTestId('attachment-list').first()).toBeVisible();
  });
});
