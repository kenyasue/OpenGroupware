import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { BoardRepository } from '@/repositories/BoardRepository';
import { ChatRepository } from '@/repositories/ChatRepository';
import { TodoRepository } from '@/repositories/TodoRepository';
import { FileRepository } from '@/repositories/FileRepository';
import { CalendarRepository } from '@/repositories/CalendarRepository';
import { MeetingRepository } from '@/repositories/MeetingRepository';
import { MilestoneRepository } from '@/repositories/MilestoneRepository';
import { ProjectNoteRepository } from '@/repositories/ProjectNoteRepository';
import { SearchService } from '@/services/SearchService';
import { ForbiddenError } from '@/lib/errors';

function makeService(db: SqliteDatabase) {
  return new SearchService(
    new BoardRepository(db),
    new ChatRepository(db),
    new TodoRepository(db),
    new FileRepository(db),
    new CalendarRepository(db),
    new MeetingRepository(db),
    new MilestoneRepository(db),
    new ProjectNoteRepository(db),
    new ProjectMemberRepository(db)
  );
}

describe('SearchService', () => {
  let db: SqliteDatabase;
  let service: SearchService;
  let projectId: number;
  let userId: number;
  let outsiderId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    service = makeService(db);
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
    const members = new ProjectMemberRepository(db);
    members.add(projectId, userId, 'admin');
  });

  afterEach(() => db.close());

  function seedKeyword(keyword: string) {
    const col = new TodoRepository(db).createColumn({
      projectId,
      name: 'Todo',
      orderIndex: 0,
    }).id;
    new BoardRepository(db).createThread({
      projectId,
      title: `thread ${keyword}`,
      bodyMd: 'body',
      authorId: userId,
      category: null,
    });
    new ChatRepository(db).create({
      projectId,
      authorId: userId,
      body: `chat ${keyword}`,
    });
    new TodoRepository(db).createItem({
      projectId,
      columnId: col,
      title: `task ${keyword}`,
      creatorId: userId,
      orderIndex: 0,
    });
    new FileRepository(db).create({
      projectId,
      uploaderId: userId,
      filename: 'a.bin',
      originalName: `file-${keyword}.txt`,
      mimeType: 'text/plain',
      size: 1,
      path: '/tmp/a',
    });
    new CalendarRepository(db).create({
      projectId,
      title: `event ${keyword}`,
      type: 'custom',
      startAt: '2026-06-15T10:00:00',
      createdById: userId,
    });
    new MeetingRepository(db).create({
      projectId,
      title: `meeting ${keyword}`,
      startAt: '2026-06-15T10:00:00',
      endAt: '2026-06-15T11:00:00',
      createdById: userId,
    });
    new MilestoneRepository(db).create({ projectId, title: `ms ${keyword}` });
    new ProjectNoteRepository(db).create({
      projectId,
      title: `note ${keyword}`,
      bodyMd: 'body',
      tags: null,
      createdById: userId,
    });
  }

  it('returns results across all resource types for a keyword', () => {
    seedKeyword('unicorn');
    const results = service.search(userId, projectId, { q: 'unicorn' });
    const types = new Set(results.map((r) => r.type));
    expect(types.has('thread')).toBe(true);
    expect(types.has('chat')).toBe(true);
    expect(types.has('todo')).toBe(true);
    expect(types.has('file')).toBe(true);
    expect(types.has('event')).toBe(true);
    expect(types.has('meeting')).toBe(true);
    expect(types.has('milestone')).toBe(true);
    expect(types.has('note')).toBe(true);
  });

  it('filters by a single type', () => {
    seedKeyword('unicorn');
    const results = service.search(userId, projectId, {
      q: 'unicorn',
      type: 'todo',
    });
    expect(results.every((r) => r.type === 'todo')).toBe(true);
    expect(results).toHaveLength(1);
  });

  it('returns no results for an unmatched keyword', () => {
    seedKeyword('unicorn');
    expect(service.search(userId, projectId, { q: 'nomatch' })).toEqual([]);
  });

  it('returns nothing for an empty query', () => {
    seedKeyword('unicorn');
    expect(service.search(userId, projectId, { q: '' })).toEqual([]);
  });

  it('forbids a non-member', () => {
    seedKeyword('unicorn');
    expect(() =>
      service.search(outsiderId, projectId, { q: 'unicorn' })
    ).toThrow(ForbiddenError);
  });
});
