import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { ChatRepository } from '@/repositories/ChatRepository';

describe('ChatRepository', () => {
  let db: SqliteDatabase;
  let repo: ChatRepository;
  let projectId: number;
  let authorId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new ChatRepository(db);
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

  it('creates and finds a message', () => {
    const m = repo.create({ projectId, authorId, body: 'hello' });
    expect(repo.findMessageById(m.id)?.body).toBe('hello');
  });

  it('lists messages newest first with total', () => {
    repo.create({ projectId, authorId, body: 'first' });
    repo.create({ projectId, authorId, body: 'second' });
    const { items, total } = repo.findMessages(projectId);
    expect(total).toBe(2);
    expect(items[0].body).toBe('second');
  });

  it('excludes soft-deleted messages', () => {
    const m = repo.create({ projectId, authorId, body: 'x' });
    repo.delete(m.id);
    expect(repo.findMessageById(m.id)).toBeNull();
    expect(repo.findMessages(projectId).total).toBe(0);
  });

  it('isolates messages by project', () => {
    repo.create({ projectId, authorId, body: 'mine' });
    const p2 = new ProjectRepository(db).create({
      name: 'P2',
      ownerId: authorId,
    }).id;
    repo.create({ projectId: p2, authorId, body: 'theirs' });
    expect(repo.findMessages(projectId).total).toBe(1);
    expect(repo.findMessages(p2).total).toBe(1);
  });

  it('searches messages by body', () => {
    repo.create({ projectId, authorId, body: 'hello world' });
    repo.create({ projectId, authorId, body: 'goodbye' });
    expect(repo.findMessages(projectId, { search: 'hello' }).total).toBe(1);
    expect(repo.findMessages(projectId, { search: 'nope' }).total).toBe(0);
  });

  it('paginates messages', () => {
    for (let i = 0; i < 5; i++)
      repo.create({ projectId, authorId, body: `m${i}` });
    expect(
      repo.findMessages(projectId, { page: 1, pageSize: 2 }).items
    ).toHaveLength(2);
    expect(repo.findMessages(projectId, { page: 1, pageSize: 2 }).total).toBe(
      5
    );
  });

  it('updates a message body', () => {
    const m = repo.create({ projectId, authorId, body: 'x' });
    expect(repo.update(m.id, 'edited')?.body).toBe('edited');
  });
});
