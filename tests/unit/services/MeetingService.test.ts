import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { MeetingRepository } from '@/repositories/MeetingRepository';
import { CalendarRepository } from '@/repositories/CalendarRepository';
import { TodoRepository } from '@/repositories/TodoRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { MeetingService } from '@/services/MeetingService';
import { SseHub } from '@/lib/sse/hub';
import { ForbiddenError } from '@/lib/errors';

function makeService(db: SqliteDatabase) {
  return new MeetingService(
    new MeetingRepository(db),
    new CalendarRepository(db),
    new TodoRepository(db),
    new ProjectMemberRepository(db),
    new NotificationService(new NotificationRepository(db)),
    new ActivityLogService(new ActivityLogRepository(db)),
    new SseHub(),
    db
  );
}

describe('MeetingService', () => {
  let db: SqliteDatabase;
  let service: MeetingService;
  let projectId: number;
  let authorId: number;
  let memberId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    service = makeService(db);
    const users = new UserRepository(db);
    authorId = users.create({
      name: 'A',
      email: 'a@example.com',
      passwordHash: 'h',
    }).id;
    memberId = users.create({
      name: 'M',
      email: 'm@example.com',
      passwordHash: 'h',
    }).id;
    projectId = new ProjectRepository(db).create({
      name: 'P',
      ownerId: authorId,
    }).id;
    const members = new ProjectMemberRepository(db);
    members.add(projectId, authorId, 'admin');
    members.add(projectId, memberId, 'member');
  });

  afterEach(() => db.close());

  it('creates a meeting, invites members, notifies + logs activity, returns conflicts', () => {
    const { meeting, conflicts } = service.createMeeting(authorId, projectId, {
      title: 'Kickoff',
      startAt: '2026-06-15T10:00:00',
      endAt: '2026-06-15T11:00:00',
      memberIds: [memberId],
    });
    expect(meeting.title).toBe('Kickoff');
    expect(conflicts).toEqual([]);
    expect(new NotificationRepository(db).countUnreadByUser(memberId)).toBe(1);
    expect(
      new ActivityLogRepository(db)
        .findByProject(projectId)
        .items.some((l) => l.action === 'meeting_created')
    ).toBe(true);
    expect(
      new MeetingRepository(db).findMembersByMeeting(meeting.id)
    ).toHaveLength(1);
  });

  describe('checkScheduleConflicts', () => {
    it('detects an overlapping meeting the member attends', () => {
      // 既存ミーティングに member が参加(10:00-11:00)
      const existing = service.createMeeting(authorId, projectId, {
        title: 'existing',
        startAt: '2026-06-15T10:00:00',
        endAt: '2026-06-15T11:00:00',
        memberIds: [memberId],
      }).meeting;
      // 新しいミーティング(10:30-11:30)は重複
      const conflicts = service.checkScheduleConflicts(
        projectId,
        [memberId],
        '2026-06-15T10:30:00',
        '2026-06-15T11:30:00'
      );
      expect(
        conflicts.some((c) => c.type === 'meeting' && c.refId === existing.id)
      ).toBe(true);
    });

    it('does not flag a non-overlapping meeting', () => {
      service.createMeeting(authorId, projectId, {
        title: 'existing',
        startAt: '2026-06-15T10:00:00',
        endAt: '2026-06-15T11:00:00',
        memberIds: [memberId],
      });
      const conflicts = service.checkScheduleConflicts(
        projectId,
        [memberId],
        '2026-06-15T11:00:00',
        '2026-06-15T12:00:00'
      );
      expect(conflicts.filter((c) => c.type === 'meeting')).toHaveLength(0);
    });

    it('excludes the meeting itself via excludeMeetingId', () => {
      const existing = service.createMeeting(authorId, projectId, {
        title: 'existing',
        startAt: '2026-06-15T10:00:00',
        endAt: '2026-06-15T11:00:00',
        memberIds: [memberId],
      }).meeting;
      const conflicts = service.checkScheduleConflicts(
        projectId,
        [memberId],
        '2026-06-15T10:30:00',
        '2026-06-15T11:30:00',
        existing.id
      );
      expect(conflicts.filter((c) => c.type === 'meeting')).toHaveLength(0);
    });

    it('detects an overlapping calendar event created by the member', () => {
      new CalendarRepository(db).create({
        projectId,
        title: 'member event',
        type: 'custom',
        startAt: '2026-06-15T10:00:00',
        endAt: '2026-06-15T11:00:00',
        createdById: memberId,
      });
      const conflicts = service.checkScheduleConflicts(
        projectId,
        [memberId],
        '2026-06-15T10:30:00',
        '2026-06-15T11:30:00'
      );
      expect(conflicts.some((c) => c.type === 'calendar_event')).toBe(true);
    });

    it('detects a high-priority todo due within ±3 days', () => {
      const col = new TodoRepository(db).createColumn({
        projectId,
        name: 'Todo',
        orderIndex: 0,
      }).id;
      new TodoRepository(db).createItem({
        projectId,
        columnId: col,
        title: 'urgent',
        creatorId: authorId,
        assigneeId: memberId,
        priority: 'high',
        dueDate: '2026-06-16',
        orderIndex: 0,
      });
      const conflicts = service.checkScheduleConflicts(
        projectId,
        [memberId],
        '2026-06-15T10:00:00',
        '2026-06-15T11:00:00'
      );
      expect(conflicts.some((c) => c.type === 'important_todo')).toBe(true);
    });

    it('ignores a high-priority todo due outside ±3 days', () => {
      const col = new TodoRepository(db).createColumn({
        projectId,
        name: 'Todo',
        orderIndex: 0,
      }).id;
      new TodoRepository(db).createItem({
        projectId,
        columnId: col,
        title: 'far',
        creatorId: authorId,
        assigneeId: memberId,
        priority: 'high',
        dueDate: '2026-07-01',
        orderIndex: 0,
      });
      const conflicts = service.checkScheduleConflicts(
        projectId,
        [memberId],
        '2026-06-15T10:00:00',
        '2026-06-15T11:00:00'
      );
      expect(conflicts.filter((c) => c.type === 'important_todo')).toHaveLength(
        0
      );
    });
  });

  it('updateMinutes sets minutes', () => {
    const { meeting } = service.createMeeting(authorId, projectId, {
      title: 'M',
      startAt: '2026-06-15T10:00:00',
      endAt: '2026-06-15T11:00:00',
      memberIds: [],
    });
    expect(
      service.updateMinutes(authorId, meeting.id, '# 議事録').minutesMd
    ).toBe('# 議事録');
  });

  it('delete requires creator or admin', () => {
    const { meeting } = service.createMeeting(authorId, projectId, {
      title: 'M',
      startAt: '2026-06-15T10:00:00',
      endAt: '2026-06-15T11:00:00',
      memberIds: [],
    });
    // member(非作成者・非管理者)は削除不可
    expect(() => service.deleteMeeting(memberId, meeting.id)).toThrow(
      ForbiddenError
    );
    service.deleteMeeting(authorId, meeting.id); // 作成者
    expect(new MeetingRepository(db).findById(meeting.id)).toBeNull();
  });
});
