import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { TodoRepository } from '@/repositories/TodoRepository';

describe('TodoRepository', () => {
  let db: SqliteDatabase;
  let repo: TodoRepository;
  let projectId: number;
  let userId: number;
  let columnId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new TodoRepository(db);
    userId = new UserRepository(db).create({
      name: 'U',
      email: 'u@example.com',
      passwordHash: 'h',
    }).id;
    projectId = new ProjectRepository(db).create({
      name: 'P',
      ownerId: userId,
    }).id;
    new ProjectMemberRepository(db).add(projectId, userId, 'admin');
    columnId = repo.createColumn({ projectId, name: 'Todo', orderIndex: 0 }).id;
  });

  afterEach(() => db.close());

  it('creates and lists columns ordered by order_index', () => {
    repo.createColumn({ projectId, name: 'Done', orderIndex: 2 });
    repo.createColumn({ projectId, name: 'Doing', orderIndex: 1 });
    const cols = repo.findColumns(projectId);
    expect(cols.map((c) => c.name)).toEqual(['Todo', 'Doing', 'Done']);
  });

  it('updates and deletes a column', () => {
    expect(repo.updateColumn(columnId, { name: 'Renamed' })?.name).toBe(
      'Renamed'
    );
    repo.deleteColumn(columnId);
    expect(repo.findColumnById(columnId)).toBeNull();
  });

  it('creates an item and lists by column order then item order', () => {
    repo.createItem({
      projectId,
      columnId,
      title: 'second',
      creatorId: userId,
      orderIndex: 1,
    });
    repo.createItem({
      projectId,
      columnId,
      title: 'first',
      creatorId: userId,
      orderIndex: 0,
    });
    const items = repo.findItemsByProject(projectId);
    expect(items.map((i) => i.title)).toEqual(['first', 'second']);
  });

  it('excludes soft-deleted items', () => {
    const item = repo.createItem({
      projectId,
      columnId,
      title: 'x',
      creatorId: userId,
      orderIndex: 0,
    });
    repo.deleteItem(item.id);
    expect(repo.findItemById(item.id)).toBeNull();
    expect(repo.findItemsByProject(projectId)).toHaveLength(0);
  });

  it('maxItemOrderIndex returns -1 for empty column, else max', () => {
    expect(repo.maxItemOrderIndex(columnId)).toBe(-1);
    repo.createItem({
      projectId,
      columnId,
      title: 'a',
      creatorId: userId,
      orderIndex: 5,
    });
    expect(repo.maxItemOrderIndex(columnId)).toBe(5);
  });

  it('updates item fields including column move', () => {
    const col2 = repo.createColumn({
      projectId,
      name: 'Done',
      orderIndex: 1,
    }).id;
    const item = repo.createItem({
      projectId,
      columnId,
      title: 'x',
      creatorId: userId,
      orderIndex: 0,
    });
    const updated = repo.updateItem(item.id, {
      title: 'renamed',
      columnId: col2,
      orderIndex: 0,
      completedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(updated?.columnId).toBe(col2);
    expect(updated?.title).toBe('renamed');
    expect(updated?.completedAt).toBeTruthy();
  });

  it('isolates items by project', () => {
    const p2 = new ProjectRepository(db).create({
      name: 'P2',
      ownerId: userId,
    }).id;
    const c2 = repo.createColumn({
      projectId: p2,
      name: 'X',
      orderIndex: 0,
    }).id;
    repo.createItem({
      projectId,
      columnId,
      title: 'mine',
      creatorId: userId,
      orderIndex: 0,
    });
    repo.createItem({
      projectId: p2,
      columnId: c2,
      title: 'theirs',
      creatorId: userId,
      orderIndex: 0,
    });
    expect(repo.findItemsByProject(projectId)).toHaveLength(1);
    expect(repo.findItemsByProject(p2)).toHaveLength(1);
  });
});
