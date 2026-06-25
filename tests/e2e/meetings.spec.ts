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

test.describe('meetings & schedule conflict', () => {
  test('create meetings and detect a schedule conflict for a member', async ({
    page,
    request,
  }) => {
    const projectId = await setupOwner(page);
    const memberEmail = unique('member') + '@example.com';

    // メンバー登録してプロジェクトに追加
    await request.post('/api/auth/register', {
      data: { name: 'Member', email: memberEmail, password: 'password123' },
    });
    const addRes = await page.request.post(
      `/api/projects/${projectId}/members`,
      { data: { email: memberEmail, role: 'member' } }
    );
    const memberId = ((await addRes.json()) as { member: { userId: number } })
      .member.userId;

    // 1件目ミーティング(10:00-11:00)に member 参加
    const m1 = await page.request.post(`/api/projects/${projectId}/meetings`, {
      data: {
        title: unique('M1'),
        startAt: '2026-06-15T10:00:00',
        endAt: '2026-06-15T11:00:00',
        memberIds: [memberId],
      },
    });
    expect(m1.ok()).toBeTruthy();
    expect(((await m1.json()) as { conflicts: unknown[] }).conflicts).toEqual(
      []
    );

    // 2件目(10:30-11:30)は member にとって重複 → 警告が返る
    const m2 = await page.request.post(`/api/projects/${projectId}/meetings`, {
      data: {
        title: unique('M2'),
        startAt: '2026-06-15T10:30:00',
        endAt: '2026-06-15T11:30:00',
        memberIds: [memberId],
      },
    });
    expect(m2.ok()).toBeTruthy();
    const m2Body = (await m2.json()) as {
      meeting: { id: number };
      conflicts: { type: string }[];
    };
    expect(m2Body.conflicts.some((c) => c.type === 'meeting')).toBe(true);

    // ミーティング一覧画面に両方表示
    await page.goto(`/projects/${projectId}/meetings`);
    await expect(
      page.getByTestId(`meeting-${m2Body.meeting.id}`)
    ).toBeVisible();
  });
});
