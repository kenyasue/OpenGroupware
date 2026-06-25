/**
 * カレンダー表示用の純粋な日付計算ヘルパー群。
 * React にも DB にも依存しないので Unit Test が容易。
 *
 * 週の開始は日曜日(Sunday=0)。`WEEK_START` を変更すれば月曜始めにも対応可能。
 * イベントは構造的部分型 `{ startAt: string }` を要求するだけなので
 * `CalendarEventView` に依存せず、レイヤ依存規則(lib → services 禁止)を守る。
 */

/** 週の開始曜日 (0=日曜)。 */
export const WEEK_START = 0;

export type CalendarViewMode = 'month' | 'week' | 'day';

/** Event 風オブジェクト。startAt だけ必須。 */
export interface DateableEvent {
  startAt: string;
}

/** Date を `YYYY-MM-DD` へ変換する(ローカルタイム)。 */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `YYYY-MM-DD` をローカル Date(真夜中) へパースする。 */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** n 日加算した新しい Date を返す。 */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** n 週加算した新しい Date を返す。 */
export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

/** n 月加算した新しい Date を返す(日付は維持、月跨ぎ時は月末日に丸める)。 */
export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

/** 引数の日を含む週の開始日(WEEK_START 基準)を返す。 */
export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const delta = (r.getDay() - WEEK_START + 7) % 7;
  r.setDate(r.getDate() - delta);
  return r;
}

/**
 * 月カレンダーのグリッド(週の配列)を返す。
 * 前月/翌月の日を含めて日曜始まり・土曜終わりで埋める。
 */
export function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const gridStart = startOfWeek(first);
  const last = new Date(year, month + 1, 0);
  const weeks: Date[][] = [];
  let cursor = new Date(gridStart);
  while (cursor <= last) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** 引数の日を含む週の 7 日分(日〜土)を返す。 */
export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 1日の時間グリッド 0..23 を返す。 */
export function getDayHours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

/** イベントの開始日を `YYYY-MM-DD` で取り出す(startAt の先頭10文字)。 */
export function eventDateKey(startAt: string): string {
  return startAt.slice(0, 10);
}

/**
 * イベントの開始「時」を返す。時刻なし(日付のみ)なら null(終日扱い)。
 * `2026-06-15T10:00:00` → 10 / `2026-06-15` → null
 */
export function eventHour(startAt: string): number | null {
  if (startAt.length <= 10) return null;
  const h = parseInt(startAt.slice(11, 13), 10);
  return Number.isNaN(h) ? null : h;
}

/** `YYYY-MM-DDTHH:mm:ss` または `YYYY-MM-DD` から `HH:mm` を取り出す。 */
export function formatTime(startAt: string): string {
  if (startAt.length <= 10) return '終日';
  const hh = startAt.slice(11, 13);
  const mm = startAt.slice(14, 16);
  return mm ? `${hh}:${mm}` : `${hh}:00`;
}

/** 指定日のイベントだけを抽出する。 */
export function eventsOnDay<T extends DateableEvent>(
  events: T[],
  dateKey: string
): T[] {
  return events.filter((e) => eventDateKey(e.startAt) === dateKey);
}

/**
 * ビューと基準日から ScheduleService に渡す { from, to } を計算する。
 * `to` は `T23:59:59` 付きにし、サービスの文字列比較で当日深夜のイベントも取りこぼさない。
 * month はグリッド全体(前月/翌月の溢れ日を含む)をカバーする。
 */
export function rangeForView(
  view: CalendarViewMode,
  anchor: Date
): { from: string; to: string } {
  if (view === 'day') {
    const d = toISODate(anchor);
    return { from: d, to: `${d}T23:59:59` };
  }
  if (view === 'week') {
    const days = getWeekDays(anchor);
    const from = toISODate(days[0]);
    const to = `${toISODate(days[6])}T23:59:59`;
    return { from, to };
  }
  const weeks = getMonthGrid(anchor.getFullYear(), anchor.getMonth());
  const from = toISODate(weeks[0][0]);
  const to = `${toISODate(weeks[weeks.length - 1][6])}T23:59:59`;
  return { from, to };
}

/** ビューに応じて基準日を1単位進める/戻す。 */
export function stepAnchor(
  view: CalendarViewMode,
  anchor: Date,
  direction: 1 | -1
): Date {
  if (view === 'month') return addMonths(anchor, direction);
  if (view === 'week') return addWeeks(anchor, direction);
  return addDays(anchor, direction);
}
