import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { TodoRepository } from '@/repositories/TodoRepository';
import { MilestoneRepository } from '@/repositories/MilestoneRepository';

describe('MilestoneRepository', () => {
  let db: SqliteDatabase;
  let repo: MilestoneRepository;
  let todoRepo: TodoRepository;
  let projectId: number;
  let userId: number;
  let columnId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new MilestoneRepository(db);
    todoRepo = new TodoRepository(db);
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
    columnId = todoRepo.createColumn({
      projectId,
      name: 'Todo',
      orderIndex: 0,
    }).id;
  });

  afterEach(() => db.close());

  it('creates and lists milestones ordered by due_date', () => {
    repo.create({ projectId, title: 'M2', dueDate: '2026-12-31' });
    repo.create({ projectId, title: 'M1', dueDate: '2026-06-30' });
    const list = repo.findByProject(projectId);
    expect(list.map((m) => m.title)).toEqual(['M1', 'M2']);
  });

  it('updates and deletes a milestone', () => {
    const m = repo.create({ projectId, title: 'M' });
    expect(repo.update(m.id, { status: 'closed' })?.status).toBe('closed');
    repo.delete(m.id);
    expect(repo.findById(m.id)).toBeNull();
  });

  it('excludes soft-deleted milestones', () => {
    const m = repo.create({ projectId, title: 'M' });
    repo.delete(m.id);
    expect(repo.findByProject(projectId)).toHaveLength(0);
  });

  it('findToDosByMilestone returns only linked, non-deleted todos', () => {
    const m = repo.create({ projectId, title: 'M' });
    const t1 = todoRepo.createItem({
      projectId,
      columnId,
      title: 't1',
      creatorId: userId,
      orderIndex: 0,
    });
    const t2 = todoRepo.createItem({
      projectId,
      columnId,
      title: 't2',
      creatorId: userId,
      orderIndex: 1,
    });
    todoRepo.updateItem(t1.id, { milestoneId: m.id });
    todoRepo.updateItem(t2.id, { milestoneId: m.id });
    todoRepo.deleteItem(t2.id); // soft delete
    const todos = repo.findToDosByMilestone(m.id);
    expect(todos).toHaveLength(1);
    expect(todos[0].id).toBe(t1.id);
  });
});
