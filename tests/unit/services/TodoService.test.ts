import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { TodoRepository } from '@/repositories/TodoRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { TodoService } from '@/services/TodoService';
import { SseHub } from '@/lib/sse/hub';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

function makeService(db: SqliteDatabase) {
  const hub = new SseHub();
  const members = new ProjectMemberRepository(db);
  const users = new UserRepository(db);
  return {
    hub,
    service: new TodoService(
      new TodoRepository(db),
      members,
      new NotificationService(new NotificationRepository(db)),
      new ActivityLogService(new ActivityLogRepository(db)),
      hub
    ),
    members,
    users,
  };
}

describe('TodoService', () => {
  let db: SqliteDatabase;
  let service: TodoService;
  let projectId: number;
  let authorId: number;
  let memberId: number;
  let outsiderId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    const ctx = makeService(db);
    service = ctx.service;
    const users = ctx.users;
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
    outsiderId = users.create({
      name: 'O',
      email: 'o@example.com',
      passwordHash: 'h',
    }).id;
    projectId = new ProjectRepository(db).create({
      name: 'P',
      ownerId: authorId,
    }).id;
    ctx.members.add(projectId, authorId, 'admin');
    ctx.members.add(projectId, memberId, 'member');
  });

  afterEach(() => db.close());

  it('auto-creates the 5 standard columns on first getColumns', () => {
    const cols = service.getColumns(authorId, projectId);
    expect(cols.map((c) => c.name)).toEqual([
      'Backlog',
      'To Do',
      'In Progress',
      'Review',
      'Done',
    ]);
  });

  it('forbids a non-member from accessing columns', () => {
    expect(() => service.getColumns(outsiderId, projectId)).toThrow(
      ForbiddenError
    );
  });

  it('creates an item with assignee → todo_assigned notification + todo_created activity', () => {
    const col = service.getColumns(authorId, projectId)[0];
    const item = service.createItem(authorId, projectId, {
      title: 'task',
      columnId: col.id,
      assigneeId: memberId,
      priority: 'high',
    });
    expect(item.assigneeId).toBe(memberId);
    expect(new NotificationRepository(db).countUnreadByUser(memberId)).toBe(1);
    expect(
      new ActivityLogRepository(db)
        .findByProject(projectId)
        .items.some((l) => l.action === 'todo_created')
    ).toBe(true);
  });

  it('does not notify when assigning to self', () => {
    const col = service.getColumns(authorId, projectId)[0];
    service.createItem(authorId, projectId, {
      title: 'self',
      columnId: col.id,
      assigneeId: authorId,
    });
    expect(new NotificationRepository(db).countUnreadByUser(authorId)).toBe(0);
  });

  it('toggling complete sets completedAt and logs todo_completed', () => {
    const col = service.getColumns(authorId, projectId)[0];
    const item = service.createItem(authorId, projectId, {
      title: 't',
      columnId: col.id,
    });
    const completed = service.toggleComplete(authorId, item.id);
    expect(completed.completedAt).not.toBeNull();
    expect(
      new ActivityLogRepository(db)
        .findByProject(projectId)
        .items.some((l) => l.action === 'todo_completed')
    ).toBe(true);
    // もう一度トグルで未完了に戻る
    const reopened = service.toggleComplete(authorId, item.id);
    expect(reopened.completedAt).toBeNull();
  });

  it('moves an item to another column', () => {
    const cols = service.getColumns(authorId, projectId);
    const item = service.createItem(authorId, projectId, {
      title: 't',
      columnId: cols[0].id,
    });
    const moved = service.moveItem(authorId, item.id, cols[4].id, 0);
    expect(moved.columnId).toBe(cols[4].id);
  });

  it('only creator or admin can delete an item', () => {
    const col = service.getColumns(authorId, projectId)[0];
    const item = service.createItem(memberId, projectId, {
      title: 't',
      columnId: col.id,
    });
    expect(() => service.deleteItem(outsiderId, item.id)).toThrow(
      ForbiddenError
    );
    service.deleteItem(authorId, item.id); // admin
    expect(() => service.toggleComplete(memberId, item.id)).toThrow(
      NotFoundError
    );
  });

  it('throws NotFoundError for a non-existent item', () => {
    expect(() => service.toggleComplete(authorId, 99999)).toThrow(
      NotFoundError
    );
  });
});
