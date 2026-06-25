import { describe, it, expect } from 'vitest';
import {
  toISODate,
  parseISODate,
  addDays,
  addMonths,
  startOfWeek,
  getMonthGrid,
  getWeekDays,
  getDayHours,
  eventDateKey,
  eventHour,
  formatTime,
  eventsOnDay,
  rangeForView,
  stepAnchor,
} from '@/lib/calendar/grid';

describe('calendar/grid', () => {
  describe('toISODate / parseISODate', () => {
    it('toISODate formats a local date as YYYY-MM-DD', () => {
      expect(toISODate(new Date(2026, 5, 15))).toBe('2026-06-15');
      expect(toISODate(new Date(2026, 0, 9))).toBe('2026-01-09');
    });

    it('parseISODate round-trips through toISODate', () => {
      const d = parseISODate('2026-06-15');
      expect(toISODate(d)).toBe('2026-06-15');
    });
  });

  describe('startOfWeek', () => {
    it('returns the Sunday of the given date week', () => {
      // 2026-06-17 is a Wednesday
      expect(toISODate(startOfWeek(new Date(2026, 5, 17)))).toBe('2026-06-14');
    });

    it('returns the same date when already on Sunday', () => {
      expect(toISODate(startOfWeek(new Date(2026, 5, 14)))).toBe('2026-06-14');
    });
  });

  describe('getMonthGrid', () => {
    it('produces full Sun-Sat weeks covering the month', () => {
      // June 2026: 1st is Monday, 30th is Tuesday
      const weeks = getMonthGrid(2026, 5);
      for (const week of weeks) {
        expect(week).toHaveLength(7);
        expect(week[0].getDay()).toBe(0); // Sunday
        expect(week[6].getDay()).toBe(6); // Saturday
      }
      // First cell is the Sunday on/before June 1 (May 31)
      expect(toISODate(weeks[0][0])).toBe('2026-05-31');
      // Last cell is the Saturday on/after June 30 (July 4)
      expect(toISODate(weeks[weeks.length - 1][6])).toBe('2026-07-04');
    });

    it('starts on the 1st when the month begins on Sunday', () => {
      // February 2026: 1st is a Sunday
      const weeks = getMonthGrid(2026, 1);
      expect(toISODate(weeks[0][0])).toBe('2026-02-01');
    });

    it('produces 4 to 6 weeks', () => {
      const weeks = getMonthGrid(2026, 5);
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks.length).toBeLessThanOrEqual(6);
    });
  });

  describe('getWeekDays / getDayHours', () => {
    it('returns 7 consecutive days Sunday-Saturday', () => {
      const days = getWeekDays(new Date(2026, 5, 17));
      expect(days).toHaveLength(7);
      expect(toISODate(days[0])).toBe('2026-06-14');
      expect(toISODate(days[6])).toBe('2026-06-20');
    });

    it('returns hours 0..23', () => {
      expect(getDayHours()).toEqual(Array.from({ length: 24 }, (_, i) => i));
    });
  });

  describe('addDays / addMonths', () => {
    it('addDays moves the date', () => {
      expect(toISODate(addDays(new Date(2026, 5, 15), 10))).toBe('2026-06-25');
      expect(toISODate(addDays(new Date(2026, 5, 15), -15))).toBe('2026-05-31');
    });

    it('addMonths rolls over the year', () => {
      expect(toISODate(addMonths(new Date(2026, 11, 15), 1))).toBe(
        '2027-01-15'
      );
    });
  });

  describe('eventDateKey / eventHour / formatTime', () => {
    it('eventDateKey takes the first 10 chars', () => {
      expect(eventDateKey('2026-06-15T10:30:00')).toBe('2026-06-15');
      expect(eventDateKey('2026-06-15')).toBe('2026-06-15');
    });

    it('eventHour returns the hour for timed events and null otherwise', () => {
      expect(eventHour('2026-06-15T10:30:00')).toBe(10);
      expect(eventHour('2026-06-15')).toBeNull();
      expect(eventHour('2026-06-15T09:00:00')).toBe(9);
    });

    it('formatTime renders HH:mm or 終日', () => {
      expect(formatTime('2026-06-15T10:30:00')).toBe('10:30');
      expect(formatTime('2026-06-15')).toBe('終日');
    });
  });

  describe('eventsOnDay', () => {
    const events = [
      { startAt: '2026-06-15T10:00:00', title: 'A' },
      { startAt: '2026-06-15', title: 'B' },
      { startAt: '2026-06-16T09:00:00', title: 'C' },
    ];

    it('filters events whose start date matches the day key', () => {
      const result = eventsOnDay(events, '2026-06-15');
      expect(result.map((e) => e.title)).toEqual(['A', 'B']);
    });

    it('returns empty when nothing matches', () => {
      expect(eventsOnDay(events, '2026-07-01')).toHaveLength(0);
    });
  });

  describe('rangeForView', () => {
    it('day range covers a single day ending at T23:59:59', () => {
      const r = rangeForView('day', new Date(2026, 5, 15));
      expect(r).toEqual({ from: '2026-06-15', to: '2026-06-15T23:59:59' });
    });

    it('week range covers Sun-Sat ending at T23:59:59', () => {
      const r = rangeForView('week', new Date(2026, 5, 17));
      expect(r).toEqual({ from: '2026-06-14', to: '2026-06-20T23:59:59' });
    });

    it('month range covers the whole grid including overflow days', () => {
      const r = rangeForView('month', new Date(2026, 5, 15));
      expect(r.from).toBe('2026-05-31');
      expect(r.to).toBe('2026-07-04T23:59:59');
    });
  });

  describe('stepAnchor', () => {
    it('steps months for month view', () => {
      expect(toISODate(stepAnchor('month', new Date(2026, 5, 15), 1))).toBe(
        '2026-07-15'
      );
      expect(toISODate(stepAnchor('month', new Date(2026, 5, 15), -1))).toBe(
        '2026-05-15'
      );
    });

    it('steps weeks for week view', () => {
      expect(toISODate(stepAnchor('week', new Date(2026, 5, 17), 1))).toBe(
        '2026-06-24'
      );
    });

    it('steps days for day view', () => {
      expect(toISODate(stepAnchor('day', new Date(2026, 5, 15), 1))).toBe(
        '2026-06-16'
      );
      expect(toISODate(stepAnchor('day', new Date(2026, 5, 15), -1))).toBe(
        '2026-06-14'
      );
    });
  });
});
