import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { ProjectNoteRepository } from '@/repositories/ProjectNoteRepository';

describe('ProjectNoteRepository', () => {
  let db: SqliteDatabase;
  let repo: ProjectNoteRepository;
  let projectId: number;
  let userId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new ProjectNoteRepository(db);
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
  });

  afterEach(() => db.close());

  function createNote(title: string, tags: string | null = null) {
    return repo.create({
      projectId,
      title,
      bodyMd: 'body',
      tags,
      createdById: userId,
    });
  }

  it('creates and finds a note', () => {
    const n = createNote('N1', 'tag1,tag2');
    expect(repo.findNoteById(n.id)?.title).toBe('N1');
    expect(repo.findNoteById(n.id)?.tags).toBe('tag1,tag2');
  });

  it('lists notes pinned-first then recently updated', () => {
    const a = createNote('a');
    const b = createNote('b');
    repo.update(a.id, { isPinned: 1, updatedById: userId });

    const { items } = repo.findNotes(projectId);
    expect(items[0].id).toBe(a.id);
    expect(items[1].id).toBe(b.id);
  });

  it('excludes soft-deleted notes', () => {
    const n = createNote('N');
    repo.delete(n.id);
    expect(repo.findNoteById(n.id)).toBeNull();
    expect(repo.findNotes(projectId).total).toBe(0);
  });

  it('isolates notes by project', () => {
    createNote('mine');
    const p2 = new ProjectRepository(db).create({
      name: 'P2',
      ownerId: userId,
    }).id;
    repo.create({
      projectId: p2,
      title: 'theirs',
      bodyMd: 'b',
      tags: null,
      createdById: userId,
    });
    expect(repo.findNotes(projectId).total).toBe(1);
    expect(repo.findNotes(p2).total).toBe(1);
  });

  it('searches notes by title/body/tags', () => {
    createNote('Alpha', 'x');
    createNote('Beta', 'special');
    expect(repo.findNotes(projectId, { search: 'alpha' }).total).toBe(1);
    expect(repo.findNotes(projectId, { search: 'special' }).total).toBe(1);
    expect(repo.findNotes(projectId, { search: 'nomatch' }).total).toBe(0);
  });

  it('paginates notes', () => {
    for (let i = 0; i < 5; i++) createNote(`n${i}`);
    expect(
      repo.findNotes(projectId, { page: 1, pageSize: 2 }).items
    ).toHaveLength(2);
    expect(repo.findNotes(projectId, { page: 1, pageSize: 2 }).total).toBe(5);
  });

  it('updates note fields and updatedById', () => {
    const n = createNote('N');
    const updated = repo.update(n.id, {
      title: 'N2',
      bodyMd: 'new',
      isPinned: 1,
      updatedById: userId,
    });
    expect(updated?.title).toBe('N2');
    expect(updated?.bodyMd).toBe('new');
    expect(updated?.isPinned).toBe(1);
    expect(updated?.updatedById).toBe(userId);
  });
});
