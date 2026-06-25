'use client';

import type { CalendarEventView } from '@/services/ScheduleService';
import { eventsOnDay, toISODate } from '@/lib/calendar/grid';
import {
  SOURCE_COLORS,
  SOURCE_CHIP_BORDER,
  WEEKDAY_LABELS,
} from '@/components/calendar/sourceColors';

const MAX_VISIBLE_CHIPS = 3;

/**
 * 月表示グリッド。日曜始まりの7列グリッドで各日にイベントチップを表示する。
 * 長いタイトルは truncate し、3件を超える分は「+N件」でまとめる。
 */
export function MonthView({
  events,
  weeks,
  anchorMonth,
  todayKey,
  onSelectDate,
}: {
  events: CalendarEventView[];
  weeks: Date[][];
  anchorMonth: number;
  todayKey: string;
  onSelectDate: (dateKey: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="grid grid-cols-7 border-b bg-gray-50 text-center text-xs font-medium text-gray-500">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-2">
            {w}
          </div>
        ))}
      </div>
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day) => {
              const key = toISODate(day);
              const dayEvents = eventsOnDay(events, key);
              const inMonth = day.getMonth() === anchorMonth;
              const isToday = key === todayKey;
              const visible = dayEvents.slice(0, MAX_VISIBLE_CHIPS);
              const hidden = dayEvents.length - visible.length;
              return (
                <div
                  key={key}
                  className={`min-h-[110px] border-r border-t p-1 last:border-r-0 ${
                    inMonth ? 'bg-white' : 'bg-gray-50'
                  }`}
                  data-testid={`calendar-day-${key}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectDate(key)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? 'bg-blue-600 font-bold text-white'
                        : inMonth
                          ? 'text-gray-700 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-100'
                    }`}
                    aria-label={`${key} の詳細を開く`}
                  >
                    {day.getDate()}
                  </button>
                  <div className="mt-1 space-y-0.5">
                    {visible.map((e) => (
                      <button
                        key={e.key}
                        type="button"
                        onClick={() => onSelectDate(key)}
                        title={e.title}
                        className={`block w-full truncate rounded border px-1 text-left text-xs ${
                          SOURCE_COLORS[e.source] ?? 'bg-gray-100 text-gray-600'
                        } ${SOURCE_CHIP_BORDER[e.source] ?? 'border-gray-200'}`}
                        data-testid={`calendar-event-${e.key}`}
                      >
                        {e.title}
                      </button>
                    ))}
                    {hidden > 0 && (
                      <button
                        type="button"
                        onClick={() => onSelectDate(key)}
                        aria-label={`${key}の残り${hidden}件を開く`}
                        className="block w-full truncate text-left text-xs text-gray-400 hover:text-gray-600"
                      >
                        +{hidden}件
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
