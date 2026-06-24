import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { ActivityLogService } from '@/services/ActivityLogService';

describe('ActivityLogService', () => {
  let db: SqliteDatabase;
  let repo: ActivityLogRepository;
  let service: ActivityLogService;
  let userId: number;
  let projectId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new ActivityLogRepository(db);
    service = new ActivityLogService(repo);
    userId = new UserRepository(db).create({
      name: 'U',
      email: 'u@example.com',
      passwordHash: 'h',
    }).id;
    projectId = new ProjectRepository(db).create({
      name: 'P',
      ownerId: userId,
    }).id;
  });

  afterEach(() => db.close());

  it('logActivity creates a log entry with serialized metadata', () => {
    const log = service.logActivity({
      projectId,
      actorId: userId,
      action: 'todo_created',
      targetType: 'todo',
      targetId: 1,
      metadata: { title: 'T' },
    });

    expect(log.action).toBe('todo_created');
    expect(log.metadataJson).toBe(JSON.stringify({ title: 'T' }));
  });

  it('logActivity stores null metadata when not provided', () => {
    const log = service.logActivity({
      projectId,
      actorId: userId,
      action: 'member_added',
      targetType: 'member',
      targetId: 2,
    });

    expect(log.metadataJson).toBeNull();
  });

  it('listByProject returns paginated logs for the project', () => {
    service.logActivity({
      projectId,
      actorId: userId,
      action: 'a',
      targetType: 't',
      targetId: 1,
    });
    service.logActivity({
      projectId,
      actorId: userId,
      action: 'b',
      targetType: 't',
      targetId: 2,
    });

    const result = service.listByProject(projectId, 1);

    expect(result.total).toBe(2);
    expect(result.items[0].action).toBe('b');
  });

  it('listByProject isolates by project', () => {
    const p2 = new ProjectRepository(db).create({
      name: 'P2',
      ownerId: userId,
    }).id;
    service.logActivity({
      projectId,
      actorId: userId,
      action: 'a',
      targetType: 't',
      targetId: 1,
    });
    service.logActivity({
      projectId: p2,
      actorId: userId,
      action: 'b',
      targetType: 't',
      targetId: 2,
    });

    expect(service.listByProject(projectId).total).toBe(1);
    expect(service.listByProject(p2).total).toBe(1);
  });
});
