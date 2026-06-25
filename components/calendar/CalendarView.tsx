'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CalendarEventView } from '@/services/ScheduleService';
import {
  getMonthGrid,
  getWeekDays,
  parseISODate,
  stepAnchor,
  toISODate,
  eventsOnDay,
  type CalendarViewMode,
} from '@/lib/calendar/grid';
import { WEEKDAY_LABELS } from '@/components/calendar/sourceColors';
import { MonthView } from '@/components/calendar/MonthView';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { EventDetailDialog } from '@/components/calendar/EventDetailDialog';

const VIEW_LABELS: { mode: CalendarViewMode; label: string }[] = [
  { mode: 'month', label: '月' },
  { mode: 'week', label: '週' },
  { mode: 'day', label: '日' },
];

/**
 * カレンダーUIのクライアントコンテナ。
 * 表示モード切替・前/次/今日ナビ・詳細ダイアログを管理し、
 * データ取得はURL searchParams経由でServer Componentに委ねる。
 */
export function CalendarView({
  projectId,
  events,
  view,
  anchorDate,
  todayKey,
}: {
  projectId: number;
  events: CalendarEventView[];
  view: CalendarViewMode;
  anchorDate: string;
  todayKey: string;
}) {
  const router = useRouter();
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const anchor = parseISODate(anchorDate);

  function navigate(nextView: CalendarViewMode, nextAnchor: Date) {
    const params = new URLSearchParams({
      view: nextView,
      date: toISODate(nextAnchor),
    });
    router.push(`/projects/${projectId}/calendar?${params.toString()}`);
  }

  function changeView(nextView: CalendarViewMode) {
    navigate(nextView, anchor);
  }

  function goPrev() {
    navigate(view, stepAnchor(view, anchor, -1));
  }

  function goNext() {
    navigate(view, stepAnchor(view, anchor, 1));
  }

  function goToday() {
    navigate(view, new Date());
  }

  function openDetail(dateKey: string) {
    setSelectedDateKey(dateKey);
  }

  const title = buildTitle(view, anchor);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          className="text-xl font-bold text-gray-800"
          data-testid="calendar-title"
        >
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded border">
            {VIEW_LABELS.map((v) => (
              <button
                key={v.mode}
                type="button"
                onClick={() => changeView(v.mode)}
                className={`px-3 py-1 text-sm ${
                  view === v.mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                data-testid={`calendar-view-${v.mode}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              className="rounded border bg-white px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              aria-label="前へ"
              data-testid="calendar-prev"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded border bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
              data-testid="calendar-today"
            >
              今日
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded border bg-white px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              aria-label="次へ"
              data-testid="calendar-next"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {view === 'month' && (
        <MonthView
          events={events}
          weeks={getMonthGrid(anchor.getFullYear(), anchor.getMonth())}
          anchorMonth={anchor.getMonth()}
          todayKey={todayKey}
          onSelectDate={openDetail}
        />
      )}
      {view === 'week' && (
        <WeekView
          events={events}
          days={getWeekDays(anchor)}
          todayKey={todayKey}
          onSelectDate={openDetail}
        />
      )}
      {view === 'day' && (
        <DayView
          day={anchor}
          events={events}
          todayKey={todayKey}
          onSelectDate={openDetail}
        />
      )}

      {selectedDateKey && (
        <EventDetailDialog
          date={parseISODate(selectedDateKey)}
          events={eventsOnDay(events, selectedDateKey)}
          onClose={() => setSelectedDateKey(null)}
        />
      )}
    </div>
  );
}

function buildTitle(view: CalendarViewMode, anchor: Date): string {
  if (view === 'month') {
    return `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`;
  }
  if (view === 'week') {
    const days = getWeekDays(anchor);
    const s = days[0];
    const e = days[6];
    return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 〜 ${e.getMonth() + 1}月${e.getDate()}日`;
  }
  return `${anchor.getFullYear()}年${anchor.getMonth() + 1}月${anchor.getDate()}日(${WEEKDAY_LABELS[anchor.getDay()]})`;
}
