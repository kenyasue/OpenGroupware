import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';

describe('ActivityLogRepository', () => {
  let db: SqliteDatabase;
  let repo: ActivityLogRepository;
  let userId: number;
  let projectId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new ActivityLogRepository(db);
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

  it('creates an activity log entry', () => {
    const log = repo.create({
      projectId,
      actorId: userId,
      action: 'todo_created',
      targetType: 'todo',
      targetId: 1,
      metadataJson: JSON.stringify({ title: 'T' }),
    });

    expect(log.id).toBeGreaterThan(0);
    expect(log.action).toBe('todo_created');
    expect(log.projectId).toBe(projectId);
  });

  it('lists logs for a project (newest first) with total', () => {
    repo.create({
      projectId,
      actorId: userId,
      action: 'a',
      targetType: 't',
      targetId: 1,
      metadataJson: null,
    });
    repo.create({
      projectId,
      actorId: userId,
      action: 'b',
      targetType: 't',
      targetId: 2,
      metadataJson: null,
    });

    const result = repo.findByProject(projectId, 1, 20);

    expect(result.total).toBe(2);
    expect(result.items[0].action).toBe('b');
  });

  it('isolates logs per project', () => {
    const p2 = new ProjectRepository(db).create({
      name: 'P2',
      ownerId: userId,
    }).id;
    repo.create({
      projectId,
      actorId: userId,
      action: 'a',
      targetType: 't',
      targetId: 1,
      metadataJson: null,
    });
    repo.create({
      projectId: p2,
      actorId: userId,
      action: 'b',
      targetType: 't',
      targetId: 2,
      metadataJson: null,
    });

    expect(repo.findByProject(projectId).total).toBe(1);
    expect(repo.findByProject(p2).total).toBe(1);
  });

  it('paginates results', () => {
    for (let i = 0; i < 5; i++) {
      repo.create({
        projectId,
        actorId: userId,
        action: 'a',
        targetType: 't',
        targetId: i,
        metadataJson: null,
      });
    }

    const page1 = repo.findByProject(projectId, 1, 2);
    const page2 = repo.findByProject(projectId, 2, 2);

    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page1.total).toBe(5);
  });
});
