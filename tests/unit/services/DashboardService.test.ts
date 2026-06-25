import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { TodoRepository } from '@/repositories/TodoRepository';
import { ChatRepository } from '@/repositories/ChatRepository';
import { BoardRepository } from '@/repositories/BoardRepository';
import { ProjectNoteRepository } from '@/repositories/ProjectNoteRepository';
import { FileRepository } from '@/repositories/FileRepository';
import { MeetingRepository } from '@/repositories/MeetingRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { CalendarRepository } from '@/repositories/CalendarRepository';
import { MilestoneRepository } from '@/repositories/MilestoneRepository';
import { ActivityLogService } from '@/services/ActivityLogService';
import { ScheduleService } from '@/services/ScheduleService';
import { DashboardService } from '@/services/DashboardService';
import { ForbiddenError } from '@/lib/errors';

function makeServices(db: SqliteDatabase) {
  const memberRepo = new ProjectMemberRepository(db);
  const scheduleService = new ScheduleService(
    new CalendarRepository(db),
    new MilestoneRepository(db),
    new TodoRepository(db),
    memberRepo,
    new ActivityLogService(new ActivityLogRepository(db))
  );
  const dashboard = new DashboardService(
    new ProjectRepository(db),
    new TodoRepository(db),
    new ChatRepository(db),
    new BoardRepository(db),
    new ProjectNoteRepository(db),
    new FileRepository(db),
    new MeetingRepository(db),
    new ActivityLogRepository(db),
    new NotificationRepository(db),
    memberRepo,
    scheduleService
  );
  return { dashboard, memberRepo };
}

describe('DashboardService', () => {
  let db: SqliteDatabase;
  let dashboard: DashboardService;
  let projectId: number;
  let userId: number;
  let outsiderId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    const ctx = makeServices(db);
    dashboard = ctx.dashboard;
    const users = new UserRepository(db);
    userId = users.create({
      name: 'U',
      email: 'u@example.com',
      passwordHash: 'h',
    }).id;
    outsiderId = users.create({
      name: 'O',
      email: 'o@example.com',
      passwordHash: 'h',
    }).id;
    projectId = new ProjectRepository(db).create({
      name: 'P',
      ownerId: userId,
    }).id;
    ctx.memberRepo.add(projectId, userId, 'admin');
  });

  afterEach(() => db.close());

  it('getProjectDashboard aggregates the project resources', () => {
    const col = new TodoRepository(db).createColumn({
      projectId,
      name: 'Todo',
      orderIndex: 0,
    }).id;
    const todoRepo = new TodoRepository(db);
    todoRepo.createItem({
      projectId,
      columnId: col,
      title: 't1',
      creatorId: userId,
      orderIndex: 0,
      dueDate: '2099-01-01',
    });
    todoRepo.createItem({
      projectId,
      columnId: col,
      title: 'done',
      creatorId: userId,
      orderIndex: 1,
    });
    todoRepo.updateItem(2, { completedAt: '2099-01-01T00:00:00.000Z' });
    new ChatRepository(db).create({ projectId, authorId: userId, body: 'hi' });
    new BoardRepository(db).createThread({
      projectId,
      title: 'thread',
      bodyMd: 'b',
      authorId: userId,
      category: null,
    });
    new ProjectNoteRepository(db).create({
      projectId,
      title: 'note',
      bodyMd: 'b',
      tags: null,
      createdById: userId,
    });
    new FileRepository(db).create({
      projectId,
      uploaderId: userId,
      filename: 'a.bin',
      originalName: 'a',
      mimeType: 'text/plain',
      size: 1,
      path: '/tmp/a',
    });
    new MeetingRepository(db).create({
      projectId,
      title: 'future',
      startAt: '2099-06-15T10:00:00',
      endAt: '2099-06-15T11:00:00',
      createdById: userId,
    });
    new MilestoneRepository(db).create({ projectId, title: 'M' });

    const d = dashboard.getProjectDashboard(userId, projectId);
    expect(d.project.id).toBe(projectId);
    expect(d.inProgressTodos).toHaveLength(1); // t1 not completed, 'done' is completed
    expect(d.latestChat).toHaveLength(1);
    expect(d.latestBoard).toHaveLength(1);
    expect(d.latestNotes).toHaveLength(1);
    expect(d.recentFiles).toHaveLength(1);
    expect(d.nextMeeting?.title).toBe('future');
    expect(d.milestones).toHaveLength(1);
  });

  it('getProjectDashboard forbids a non-member', () => {
    expect(() => dashboard.getProjectDashboard(outsiderId, projectId)).toThrow(
      ForbiddenError
    );
  });

  it('getPersonalDashboard returns my projects, todos, notifications', () => {
    const col = new TodoRepository(db).createColumn({
      projectId,
      name: 'Todo',
      orderIndex: 0,
    }).id;
    new TodoRepository(db).createItem({
      projectId,
      columnId: col,
      title: 'mine',
      creatorId: userId,
      assigneeId: userId,
      orderIndex: 0,
      dueDate: '2099-01-01',
    });
    new NotificationRepository(db).create({
      userId,
      projectId,
      type: 'mention',
      title: 'n',
      body: null,
    });

    const d = dashboard.getPersonalDashboard(userId);
    expect(d.projects.map((p) => p.id)).toContain(projectId);
    expect(d.incompleteTodos).toHaveLength(1);
    expect(d.unreadNotificationCount).toBe(1);
    expect(d.overdueTasks).toHaveLength(0); // due 2099, not overdue
  });
});
