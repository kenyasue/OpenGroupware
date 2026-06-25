'use client';

import type { CalendarEventView } from '@/services/ScheduleService';
import { eventsOnDay, formatTime, toISODate } from '@/lib/calendar/grid';
import {
  SOURCE_COLORS,
  SOURCE_CHIP_BORDER,
  WEEKDAY_LABELS,
} from '@/components/calendar/sourceColors';

/**
 * 週表示。日〜土の7日を並べ、各日のイベントを開始時刻付きで表示する。
 */
export function WeekView({
  events,
  days,
  todayKey,
  onSelectDate,
}: {
  events: CalendarEventView[];
  days: Date[];
  todayKey: string;
  onSelectDate: (dateKey: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="grid grid-cols-7 border-b bg-gray-50 text-center text-xs font-medium text-gray-500">
        {days.map((d) => {
          const key = toISODate(d);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className="py-2 hover:bg-gray-100"
              data-testid={`calendar-weekday-${key}`}
            >
              <div className="text-gray-500">{WEEKDAY_LABELS[d.getDay()]}</div>
              <div
                className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                  key === todayKey
                    ? 'bg-blue-600 font-bold text-white'
                    : 'text-gray-700'
                }`}
              >
                {d.getDate()}
              </div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = toISODate(d);
          const dayEvents = eventsOnDay(events, key);
          return (
            <div
              key={key}
              className="min-h-[400px] border-r p-1 last:border-r-0"
              data-testid={`calendar-week-cell-${key}`}
            >
              <div className="space-y-1">
                {dayEvents.length === 0 ? (
                  <p className="px-1 py-1 text-xs text-gray-300">-</p>
                ) : (
                  dayEvents.map((e) => (
                    <button
                      key={e.key}
                      type="button"
                      onClick={() => onSelectDate(key)}
                      title={e.title}
                      className={`block w-full truncate rounded border px-1 py-0.5 text-left text-xs ${
                        SOURCE_COLORS[e.source] ?? 'bg-gray-100 text-gray-600'
                      } ${SOURCE_CHIP_BORDER[e.source] ?? 'border-gray-200'}`}
                      data-testid={`calendar-event-${e.key}`}
                    >
                      <span className="font-mono text-[10px] opacity-70">
                        {formatTime(e.startAt)}
                      </span>{' '}
                      {e.title}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
