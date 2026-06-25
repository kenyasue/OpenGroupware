import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { CalendarRepository } from '@/repositories/CalendarRepository';
import { MilestoneRepository } from '@/repositories/MilestoneRepository';
import { TodoRepository } from '@/repositories/TodoRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { ActivityLogService } from '@/services/ActivityLogService';
import { ScheduleService } from '@/services/ScheduleService';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

function makeService(db: SqliteDatabase) {
  return new ScheduleService(
    new CalendarRepository(db),
    new MilestoneRepository(db),
    new TodoRepository(db),
    new ProjectMemberRepository(db),
    new ActivityLogService(new ActivityLogRepository(db))
  );
}

describe('ScheduleService', () => {
  let db: SqliteDatabase;
  let service: ScheduleService;
  let projectId: number;
  let authorId: number;
  let outsiderId: number;
  let columnId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    service = makeService(db);
    const users = new UserRepository(db);
    authorId = users.create({
      name: 'A',
      email: 'a@example.com',
      passwordHash: 'h',
    }).id;
    outsiderId = users.create({
      name: 'O',
      email: 'o@example.com',
      passwordHash: 'h',
    }).id;
    projectId = new ProjectRepository(db).create({
      name: 'P',
      ownerId: authorId,
    }).id;
    const members = new ProjectMemberRepository(db);
    members.add(projectId, authorId, 'admin');
    columnId = new TodoRepository(db).createColumn({
      projectId,
      name: 'Todo',
      orderIndex: 0,
    }).id;
  });

  afterEach(() => db.close());

  describe('getCalendarEvents (aggregation)', () => {
    it('aggregates custom events + milestones + todos within range', () => {
      service.createEvent(authorId, {
        projectId,
        title: 'Meeting',
        type: 'meeting',
        startAt: '2026-06-10T10:00:00',
      });
      service.createMilestone(authorId, projectId, {
        title: 'M1',
        dueDate: '2026-06-20',
      });
      const todoRepo = new TodoRepository(db);
      todoRepo.createItem({
        projectId,
        columnId,
        title: 'task',
        creatorId: authorId,
        orderIndex: 0,
        dueDate: '2026-06-15',
      });
      const views = service.getCalendarEvents(authorId, projectId, {
        from: '2026-06-01',
        to: '2026-06-30',
      });
      const sources = views.map((v) => v.source).sort();
      expect(sources).toEqual(['event', 'milestone', 'todo']);
      expect(views[0].startAt).toBe('2026-06-10T10:00:00'); // earliest first
    });

    it('excludes items outside the range', () => {
      service.createMilestone(authorId, projectId, {
        title: 'M',
        dueDate: '2026-07-15',
      });
      const views = service.getCalendarEvents(authorId, projectId, {
        from: '2026-06-01',
        to: '2026-06-30',
      });
      expect(views).toHaveLength(0);
    });

    it('forbids a non-member', () => {
      expect(() =>
        service.getCalendarEvents(outsiderId, projectId, {
          from: '2026-06-01',
          to: '2026-06-30',
        })
      ).toThrow(ForbiddenError);
    });
  });

  describe('milestone progress', () => {
    it('returns 0% when there are no related todos', () => {
      const m = service.createMilestone(authorId, projectId, { title: 'M' });
      expect(service.calcMilestoneProgress(m.id)).toBe(0);
      expect(service.getMilestoneProgress(authorId, m.id)).toBe(0);
    });

    it('returns the completion ratio rounded', () => {
      const m = service.createMilestone(authorId, projectId, { title: 'M' });
      const todoRepo = new TodoRepository(db);
      const t1 = todoRepo.createItem({
        projectId,
        columnId,
        title: 'a',
        creatorId: authorId,
        orderIndex: 0,
      });
      const t2 = todoRepo.createItem({
        projectId,
        columnId,
        title: 'b',
        creatorId: authorId,
        orderIndex: 1,
      });
      const t3 = todoRepo.createItem({
        projectId,
        columnId,
        title: 'c',
        creatorId: authorId,
        orderIndex: 2,
      });
      for (const t of [t1, t2, t3])
        todoRepo.updateItem(t.id, { milestoneId: m.id });
      // 1/3 完了
      todoRepo.updateItem(t1.id, { completedAt: '2026-06-01T00:00:00.000Z' });
      expect(service.calcMilestoneProgress(m.id)).toBe(33);
      // 3/3 完了 → 100
      todoRepo.updateItem(t2.id, { completedAt: '2026-06-02T00:00:00.000Z' });
      todoRepo.updateItem(t3.id, { completedAt: '2026-06-03T00:00:00.000Z' });
      expect(service.calcMilestoneProgress(m.id)).toBe(100);
    });

    it('getMilestones attaches progress', () => {
      const m = service.createMilestone(authorId, projectId, { title: 'M' });
      const list = service.getMilestones(authorId, projectId);
      expect(list[0].progress).toBe(0);
      expect(list[0].id).toBe(m.id);
    });
  });

  describe('milestone CRUD', () => {
    it('update logs milestone_updated activity', () => {
      const m = service.createMilestone(authorId, projectId, { title: 'M' });
      service.updateMilestone(authorId, m.id, { status: 'closed' });
      expect(
        new ActivityLogRepository(db)
          .findByProject(projectId)
          .items.some((l) => l.action === 'milestone_updated')
      ).toBe(true);
    });

    it('delete requires admin', () => {
      const m = service.createMilestone(authorId, projectId, { title: 'M' });
      service.deleteMilestone(authorId, m.id); // authorId is admin
      expect(() =>
        service.updateMilestone(authorId, m.id, { title: 'x' })
      ).toThrow(NotFoundError);
    });
  });
});
