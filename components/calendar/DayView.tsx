'use client';

import type { CalendarEventView } from '@/services/ScheduleService';
import {
  eventsOnDay,
  eventHour,
  formatTime,
  getDayHours,
  toISODate,
} from '@/lib/calendar/grid';
import {
  SOURCE_COLORS,
  SOURCE_CHIP_BORDER,
  WEEKDAY_LABELS,
} from '@/components/calendar/sourceColors';

/**
 * 日表示(時間グリッド)。0:00〜23:00 を1時間刻みで表示し、
 * 時刻付きイベントを該当時刻行に、終日(日付のみ)イベントを上部に配置する。
 */
export function DayView({
  day,
  events,
  todayKey,
  onSelectDate,
}: {
  day: Date;
  events: CalendarEventView[];
  todayKey: string;
  onSelectDate: (dateKey: string) => void;
}) {
  const key = toISODate(day);
  const dayEvents = eventsOnDay(events, key);
  const allDay = dayEvents.filter((e) => eventHour(e.startAt) === null);
  const timed = dayEvents.filter((e) => eventHour(e.startAt) !== null);
  const hours = getDayHours();
  const isToday = key === todayKey;

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b p-3">
        <button
          type="button"
          onClick={() => onSelectDate(key)}
          className="text-left"
        >
          <p className="text-lg font-bold text-gray-800">
            {day.getMonth() + 1}月{day.getDate()}日(
            {WEEKDAY_LABELS[day.getDay()]})
          </p>
        </button>
        {isToday && (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            今日
          </span>
        )}
      </div>

      {allDay.length > 0 && (
        <div
          className="border-b bg-gray-50 p-2"
          data-testid="calendar-all-day-section"
        >
          <p className="mb-1 text-xs font-medium text-gray-500">終日</p>
          <div className="flex flex-wrap gap-1">
            {allDay.map((e) => (
              <button
                key={e.key}
                type="button"
                onClick={() => onSelectDate(key)}
                title={e.title}
                className={`max-w-full truncate rounded border px-2 py-0.5 text-xs ${
                  SOURCE_COLORS[e.source] ?? 'bg-gray-100 text-gray-600'
                } ${SOURCE_CHIP_BORDER[e.source] ?? 'border-gray-200'}`}
                data-testid={`calendar-event-${e.key}`}
              >
                {e.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((h) => {
          const hourEvents = timed.filter((e) => eventHour(e.startAt) === h);
          return (
            <div
              key={h}
              className="flex border-b last:border-b-0"
              data-testid={`calendar-hour-${String(h).padStart(2, '0')}`}
            >
              <div className="w-16 shrink-0 border-r bg-gray-50 p-1 text-right text-xs text-gray-400">
                {String(h).padStart(2, '0')}:00
              </div>
              <div className="flex-1 p-1">
                {hourEvents.map((e) => (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => onSelectDate(key)}
                    title={e.title}
                    className={`mb-1 block w-full truncate rounded border px-2 py-1 text-left text-xs ${
                      SOURCE_COLORS[e.source] ?? 'bg-gray-100 text-gray-600'
                    } ${SOURCE_CHIP_BORDER[e.source] ?? 'border-gray-200'}`}
                    data-testid={`calendar-event-${e.key}`}
                  >
                    <span className="font-mono text-[10px] opacity-70">
                      {formatTime(e.startAt)}
                    </span>{' '}
                    {e.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
