'use client';

import { useEffect, useRef } from 'react';
import type { CalendarEventView } from '@/services/ScheduleService';
import { formatTime } from '@/lib/calendar/grid';
import {
  SOURCE_COLORS,
  SOURCE_LABELS,
} from '@/components/calendar/sourceColors';

/**
 * 指定日のイベント詳細ダイアログ。
 * セル内ではtruncateされるタイトルも、ここでは全文と説明を表示する。
 * 開閉時にフォーカスをダイアログへ移し、閉じたら元の要素へ戻す。
 */
export function EventDetailDialog({
  date,
  events,
  onClose,
}: {
  date: Date;
  events: CalendarEventView[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dateLabel = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid="calendar-detail-backdrop"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="mt-16 w-full max-w-lg rounded-lg bg-white shadow-xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${dateLabel}のイベント`}
        data-testid="calendar-detail-dialog"
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold text-gray-800">{dateLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="閉じる"
            data-testid="calendar-detail-close"
          >
            ×
          </button>
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
          {events.length === 0 ? (
            <p className="text-sm text-gray-400">
              この日のイベントはありません。
            </p>
          ) : (
            events.map((e) => (
              <div
                key={e.key}
                className="rounded border border-gray-200 p-3"
                data-testid={`calendar-detail-${e.key}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-800 break-words">
                    {e.title}
                  </p>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                      SOURCE_COLORS[e.source] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {SOURCE_LABELS[e.source] ?? e.source}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {formatTime(e.startAt)}
                  {e.endAt ? ` 〜 ${formatTime(e.endAt)}` : ''}
                </p>
                {e.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                    {e.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
