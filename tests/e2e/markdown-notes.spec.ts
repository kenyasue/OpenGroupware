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

test.describe('markdown notes', () => {
  test('create, preview, pin, edit, and search notes', async ({ page }) => {
    const projectId = await setupOwner(page);
    const title = unique('Note');

    const res = await page.request.post(`/api/projects/${projectId}/notes`, {
      data: {
        title,
        bodyMd: '# Heading\n\n- item1\n- item2',
        tags: 'alpha,beta',
      },
    });
    expect(res.ok()).toBeTruthy();
    const { note } = (await res.json()) as { note: { id: number } };

    // 一覧に表示
    await page.goto(`/projects/${projectId}/notes`);
    await expect(
      page.getByRole('link', { name: new RegExp(title) })
    ).toBeVisible();

    // 詳細: Markdownがレンダリングされる
    await page.goto(`/projects/${projectId}/notes/${note.id}`);
    await expect(
      page.getByRole('heading', { name: 'Heading', level: 1 })
    ).toBeVisible();
    await expect(page.locator('li').filter({ hasText: 'item1' })).toBeVisible();

    // ピン留め + 編集(API)
    const patchRes = await page.request.patch(
      `/api/projects/${projectId}/notes/${note.id}`,
      { data: { isPinned: 1, bodyMd: '# Updated\n\nedited content' } }
    );
    expect(patchRes.ok()).toBeTruthy();
    await page.goto(`/projects/${projectId}/notes/${note.id}`);
    await expect(
      page.getByRole('heading', { name: 'Updated', level: 1 })
    ).toBeVisible();

    // 検索
    const otherTitle = unique('ZZZ');
    await page.request.post(`/api/projects/${projectId}/notes`, {
      data: { title: otherTitle, bodyMd: 'body' },
    });
    await page.goto(
      `/projects/${projectId}/notes?q=${encodeURIComponent(otherTitle)}`
    );
    await expect(
      page.getByRole('link', { name: new RegExp(otherTitle) })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: new RegExp(title) })
    ).toHaveCount(0);
  });
});
