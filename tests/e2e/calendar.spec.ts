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

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return isoDate(dt);
}

function urlDate(url: string): string | null {
  return new URL(url).searchParams.get('date');
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

    // カレンダー画面(月表示)にイベント+マイルストーン+ToDoがグリッド表示される
    await page.goto(`/projects/${projectId}/calendar`);
    await expect(page.getByTestId('calendar-view-month')).toBeVisible();
    await expect(page.getByText(/マイルストーン:/)).toBeVisible();
    await expect(page.getByText(/ToDo:/)).toBeVisible();
  });

  test('switches between month/week/day views and opens date detail', async ({
    page,
  }) => {
    const projectId = await setupOwner(page);
    const todayKey = isoDate(new Date());
    const eventTitle = unique('Evt');

    // 今日のイベントを作成(デフォルトの月表示で今日のセルに表示される)
    const evRes = await page.request.post(
      `/api/projects/${projectId}/calendar/events`,
      {
        data: {
          title: eventTitle,
          type: 'custom',
          startAt: `${todayKey}T10:00:00`,
        },
      }
    );
    expect(evRes.ok()).toBeTruthy();

    await page.goto(`/projects/${projectId}/calendar`);

    // 月表示: 今日のセルにイベントチップ
    await expect(page.getByTestId('calendar-view-month')).toBeVisible();
    await expect(page.getByTestId(`calendar-day-${todayKey}`)).toBeVisible();
    await expect(page.getByText(eventTitle)).toBeVisible();

    // 週表示へ切替
    await page.getByTestId('calendar-view-week').click();
    await expect(
      page.getByTestId(`calendar-week-cell-${todayKey}`)
    ).toBeVisible();
    await expect(page.getByText(eventTitle)).toBeVisible();

    // 日表示(時間グリッド)へ切替: 10時行にイベント
    await page.getByTestId('calendar-view-day').click();
    await expect(page.getByTestId('calendar-hour-10')).toBeVisible();
    await expect(page.getByText(eventTitle)).toBeVisible();

    // 月表示へ戻す
    await page.getByTestId('calendar-view-month').click();
    await expect(page.getByTestId('calendar-view-month')).toBeVisible();

    // 日付をクリックして詳細ダイアログを開く
    await page.getByLabel(`${todayKey} の詳細を開く`).click();
    const dialog = page.getByTestId('calendar-detail-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(eventTitle)).toBeVisible();

    // ダイアログを閉じる
    await page.getByTestId('calendar-detail-close').click();
    await expect(dialog).toBeHidden();
  });

  test('prev/next/today navigation moves the anchor by the view unit', async ({
    page,
  }) => {
    const projectId = await setupOwner(page);
    await page.goto(`/projects/${projectId}/calendar`);

    const title = page.getByTestId('calendar-title');
    await expect(title).toContainText('月');

    // 月表示: next でタイトル変化、prev で元に戻る
    const before = (await title.textContent()) ?? '';
    await page.getByTestId('calendar-next').click();
    await expect(title).not.toHaveText(before);
    await page.getByTestId('calendar-prev').click();
    await expect(title).toHaveText(before);

    // 今日ボタンで今日に戻る
    await page.getByTestId('calendar-next').click();
    await page.getByTestId('calendar-today').click();
    await expect(title).toHaveText(before);

    // 週表示: next で7日進む
    await page.getByTestId('calendar-view-week').click();
    const weekStart = urlDate(page.url());
    expect(weekStart).not.toBeNull();
    await page.getByTestId('calendar-next').click();
    expect(urlDate(page.url())).toBe(addDaysISO(weekStart!, 7));
    await page.getByTestId('calendar-prev').click();
    expect(urlDate(page.url())).toBe(weekStart);

    // 日表示: next で1日進む
    await page.getByTestId('calendar-view-day').click();
    const dayStart = urlDate(page.url());
    expect(dayStart).not.toBeNull();
    await page.getByTestId('calendar-next').click();
    expect(urlDate(page.url())).toBe(addDaysISO(dayStart!, 1));
    await page.getByTestId('calendar-prev').click();
    expect(urlDate(page.url())).toBe(dayStart);
  });
});
