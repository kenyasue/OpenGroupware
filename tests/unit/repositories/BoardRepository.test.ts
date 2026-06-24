import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { BoardRepository } from '@/repositories/BoardRepository';

describe('BoardRepository', () => {
  let db: SqliteDatabase;
  let repo: BoardRepository;
  let projectId: number;
  let authorId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new BoardRepository(db);
    authorId = new UserRepository(db).create({
      name: 'A',
      email: 'a@example.com',
      passwordHash: 'h',
    }).id;
    projectId = new ProjectRepository(db).create({
      name: 'P',
      ownerId: authorId,
    }).id;
    new ProjectMemberRepository(db).add(projectId, authorId, 'admin');
  });

  afterEach(() => db.close());

  function createThread(title: string, body = 'body') {
    return repo.createThread({
      projectId,
      title,
      bodyMd: body,
      authorId,
      category: 'notice',
    });
  }

  it('creates and finds a thread', () => {
    const t = createThread('T1');
    expect(repo.findThreadById(t.id)?.title).toBe('T1');
  });

  it('lists threads pinned-first then newest', () => {
    const t1 = createThread('old');
    const t2 = createThread('new');
    repo.updateThread(t1.id, { isPinned: 1 });

    const { items } = repo.findThreads(projectId);
    expect(items[0].id).toBe(t1.id);
    expect(items[1].id).toBe(t2.id);
  });

  it('excludes soft-deleted threads', () => {
    const t = createThread('T');
    repo.deleteThread(t.id);
    expect(repo.findThreadById(t.id)).toBeNull();
    expect(repo.findThreads(projectId).total).toBe(0);
  });

  it('isolates threads by project', () => {
    createThread('mine');
    const otherProject = new ProjectRepository(db).create({
      name: 'P2',
      ownerId: authorId,
    }).id;
    repo.createThread({
      projectId: otherProject,
      title: 'theirs',
      bodyMd: 'b',
      authorId,
      category: null,
    });

    expect(repo.findThreads(projectId).total).toBe(1);
    expect(repo.findThreads(otherProject).total).toBe(1);
  });

  it('searches threads by title and body', () => {
    createThread('Important notice', 'body');
    createThread('Other', 'special keyword');

    expect(repo.findThreads(projectId, { search: 'important' }).total).toBe(1);
    expect(repo.findThreads(projectId, { search: 'keyword' }).total).toBe(1);
    expect(repo.findThreads(projectId, { search: 'nomatch' }).total).toBe(0);
  });

  it('paginates threads', () => {
    for (let i = 0; i < 5; i++) createThread(`t${i}`);
    expect(
      repo.findThreads(projectId, { page: 1, pageSize: 2 }).items
    ).toHaveLength(2);
    expect(repo.findThreads(projectId, { page: 1, pageSize: 2 }).total).toBe(5);
  });

  it('creates and lists comments (oldest first)', () => {
    const t = createThread('T');
    const c1 = repo.createComment({
      threadId: t.id,
      authorId,
      bodyMd: 'first',
    });
    repo.createComment({ threadId: t.id, authorId, bodyMd: 'second' });

    const { items, total } = repo.findCommentsByThread(t.id);
    expect(total).toBe(2);
    expect(items[0].id).toBe(c1.id);
  });

  it('excludes soft-deleted comments', () => {
    const t = createThread('T');
    const c = repo.createComment({ threadId: t.id, authorId, bodyMd: 'x' });
    repo.deleteComment(c.id);
    expect(repo.findCommentById(c.id)).toBeNull();
    expect(repo.findCommentsByThread(t.id).total).toBe(0);
  });

  it('updates a comment body', () => {
    const t = createThread('T');
    const c = repo.createComment({ threadId: t.id, authorId, bodyMd: 'x' });
    const updated = repo.updateComment(c.id, 'updated');
    expect(updated?.bodyMd).toBe('updated');
  });
});
