/** カレンダーイベントの来源ごとの色とラベル。 */
export const SOURCE_COLORS: Record<string, string> = {
  event: 'bg-blue-100 text-blue-700',
  milestone: 'bg-purple-100 text-purple-700',
  todo: 'bg-yellow-100 text-yellow-700',
};

export const SOURCE_CHIP_BORDER: Record<string, string> = {
  event: 'border-blue-200',
  milestone: 'border-purple-200',
  todo: 'border-yellow-200',
};

export const SOURCE_LABELS: Record<string, string> = {
  event: 'イベント',
  milestone: 'マイルストーン',
  todo: 'ToDo',
};

export const WEEKDAY_LABELS = [
  '日',
  '月',
  '火',
  '水',
  '木',
  '金',
  '土',
] as const;
