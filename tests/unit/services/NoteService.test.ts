import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { ProjectNoteRepository } from '@/repositories/ProjectNoteRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { NoteService } from '@/services/NoteService';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';

function makeService(db: SqliteDatabase) {
  return new NoteService(
    new ProjectNoteRepository(db),
    new ProjectMemberRepository(db),
    new NotificationService(new NotificationRepository(db)),
    new ActivityLogService(new ActivityLogRepository(db))
  );
}

describe('NoteService', () => {
  let db: SqliteDatabase;
  let service: NoteService;
  let projectId: number;
  let authorId: number;
  let memberId: number;
  let outsiderId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    service = makeService(db);
    const users = new UserRepository(db);
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
    const members = new ProjectMemberRepository(db);
    members.add(projectId, authorId, 'admin');
    members.add(projectId, memberId, 'member');
  });

  afterEach(() => db.close());

  it('creates a note and records note_created activity', () => {
    const note = service.createNote(memberId, projectId, {
      title: 'N',
      bodyMd: 'body',
      tags: 't1',
    });
    expect(note.title).toBe('N');
    expect(
      new ActivityLogRepository(db)
        .findByProject(projectId)
        .items.some((l) => l.action === 'note_created')
    ).toBe(true);
  });

  it('forbids a non-member from creating a note', () => {
    expect(() =>
      service.createNote(outsiderId, projectId, { title: 'N', bodyMd: 'b' })
    ).toThrow(ForbiddenError);
  });

  it('rejects an empty title', () => {
    expect(() =>
      service.createNote(memberId, projectId, { title: '  ', bodyMd: 'b' })
    ).toThrow(ValidationError);
  });

  it('on update, notifies other project members and logs note_updated', () => {
    const note = service.createNote(authorId, projectId, {
      title: 'N',
      bodyMd: 'b',
    });
    service.updateNote(authorId, note.id, { bodyMd: 'edited by author' });

    // 他のメンバー(member)は更新通知を受ける
    expect(new NotificationRepository(db).countUnreadByUser(memberId)).toBe(1);
    // 操作者(author)自身には通知しない
    expect(new NotificationRepository(db).countUnreadByUser(authorId)).toBe(0);
    expect(
      new ActivityLogRepository(db)
        .findByProject(projectId)
        .items.some((l) => l.action === 'note_updated')
    ).toBe(true);
  });

  it('only author or admin can edit/delete', () => {
    const users = new UserRepository(db);
    const member2 = users.create({
      name: 'M2',
      email: 'm2@example.com',
      passwordHash: 'h',
    }).id;
    new ProjectMemberRepository(db).add(projectId, member2, 'member');
    const note = service.createNote(memberId, projectId, {
      title: 'N',
      bodyMd: 'b',
    });

    expect(() => service.updateNote(member2, note.id, { title: 'X' })).toThrow(
      ForbiddenError
    );
    expect(() =>
      service.updateNote(authorId, note.id, { title: 'X' })
    ).not.toThrow(); // admin
    expect(() =>
      service.updateNote(memberId, note.id, { title: 'Y' })
    ).not.toThrow(); // author
  });

  it('throws NotFoundError for a non-existent note', () => {
    expect(() => service.getNote(memberId, 99999)).toThrow(NotFoundError);
  });
});
