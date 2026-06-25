import { test, expect } from '@playwright/test';

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

// 1x1 透明PNG
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

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

test.describe('file sharing', () => {
  test('upload, view in lightbox, and delete a file', async ({ page }) => {
    const projectId = await setupOwner(page);

    // アップロード(multipart)
    const uploadRes = await page.request.post(
      `/api/projects/${projectId}/files`,
      {
        multipart: {
          file: {
            name: 'tiny.png',
            mimeType: 'image/png',
            buffer: PNG_BUFFER,
          },
        },
      }
    );
    expect(uploadRes.ok()).toBeTruthy();
    const { file } = (await uploadRes.json()) as { file: { id: number } };

    // ファイル一覧に表示
    await page.goto(`/projects/${projectId}/files`);
    await expect(page.getByTestId(`file-item-${file.id}`)).toBeVisible();

    // 画像をクリック → Lightbox
    await page
      .getByTestId(`file-item-${file.id}`)
      .getByRole('button')
      .first()
      .click();
    await expect(page.getByTestId('lightbox')).toBeVisible();
    // Lightboxを閉じる(リロードで確実に解除)
    await page.reload();

    // 削除(API)
    const delRes = await page.request.delete(`/api/files/${file.id}`);
    expect(delRes.ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByTestId(`file-item-${file.id}`)).toHaveCount(0);
  });
});
