export interface ScheduleConflict {
  userId: number;
  type: 'meeting' | 'calendar_event' | 'important_todo';
  refId: number;
  title: string;
  startAt: string;
  endAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  meeting: 'ミーティング',
  calendar_event: 'カレンダーイベント',
  important_todo: '期限の近い重要タスク',
};

export function ConflictWarning({
  conflicts,
}: {
  conflicts: ScheduleConflict[];
}) {
  if (conflicts.length === 0) {
    return (
      <p className="text-sm text-green-600" data-testid="no-conflicts">
        スケジュールの重複はありません。
      </p>
    );
  }
  return (
    <div
      className="rounded border border-yellow-300 bg-yellow-50 p-3"
      data-testid="conflict-warning"
    >
      <p className="text-sm font-semibold text-yellow-800">
        スケジュールの重複があります（作成は完了しています）:
      </p>
      <ul className="mt-1 list-inside list-disc text-sm text-yellow-800">
        {conflicts.map((c, i) => (
          <li key={i}>
            [{TYPE_LABELS[c.type] ?? c.type}] {c.title}（{c.startAt}
            {c.endAt ? ` 〜 ${c.endAt}` : ''}）
          </li>
        ))}
      </ul>
    </div>
  );
}
