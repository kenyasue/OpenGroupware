import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { BoardRepository } from '@/repositories/BoardRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { BoardService } from '@/services/BoardService';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';

function makeService(db: SqliteDatabase) {
  return new BoardService(
    new BoardRepository(db),
    new ProjectMemberRepository(db),
    new NotificationService(new NotificationRepository(db)),
    new ActivityLogService(new ActivityLogRepository(db))
  );
}

describe('BoardService', () => {
  let db: SqliteDatabase;
  let service: BoardService;
  let projectId: number;
  let authorId: number;
  let memberId: number;
  let outsiderId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    service = makeService(db);
    const users = new UserRepository(db);
    authorId = users.create({
      name: 'Author',
      email: 'a@example.com',
      passwordHash: 'h',
    }).id;
    memberId = users.create({
      name: 'Member',
      email: 'm@example.com',
      passwordHash: 'h',
    }).id;
    outsiderId = users.create({
      name: 'Outsider',
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

  it('allows a member to create a thread and records activity', () => {
    const thread = service.createThread(memberId, projectId, {
      title: 'T',
      bodyMd: 'body',
      category: 'notice',
    });
    expect(thread.title).toBe('T');

    const logs = new ActivityLogRepository(db).findByProject(projectId);
    expect(logs.items.some((l) => l.action === 'board_posted')).toBe(true);
  });

  it('forbids a non-member from creating a thread', () => {
    expect(() =>
      service.createThread(outsiderId, projectId, { title: 'T', bodyMd: 'b' })
    ).toThrow(ForbiddenError);
  });

  it('rejects an empty title', () => {
    expect(() =>
      service.createThread(memberId, projectId, { title: '  ', bodyMd: 'b' })
    ).toThrow(ValidationError);
  });

  it('only the author or admin can edit/delete a thread', () => {
    const users = new UserRepository(db);
    const member2 = users.create({
      name: 'Member2',
      email: 'm2@example.com',
      passwordHash: 'h',
    }).id;
    new ProjectMemberRepository(db).add(projectId, member2, 'member');

    const thread = service.createThread(memberId, projectId, {
      title: 'T',
      bodyMd: 'b',
    });
    // 非作者かつ非管理者は編集不可
    expect(() =>
      service.updateThread(member2, thread.id, { title: 'X' })
    ).toThrow(ForbiddenError);
    // 管理者は編集可
    expect(() =>
      service.updateThread(authorId, thread.id, { title: 'X' })
    ).not.toThrow();
    // 作者自身は編集可
    expect(() =>
      service.updateThread(memberId, thread.id, { title: 'Y' })
    ).not.toThrow();
    // 外部者はアクセス不可
    expect(() => service.getThread(outsiderId, thread.id)).toThrow(
      ForbiddenError
    );
  });

  it('creates a comment, notifies the thread author (not the commenter), and logs activity', () => {
    const thread = service.createThread(authorId, projectId, {
      title: 'T',
      bodyMd: 'b',
    });
    const comment = service.createComment(memberId, thread.id, 'nice post');

    expect(comment.bodyMd).toBe('nice post');
    // 通知はスレッド投稿者(authorId)へ
    const notifs = new NotificationRepository(db).findUnreadByUser(authorId);
    expect(notifs.total).toBe(1);
    // コメントした本人には通知しない
    expect(new NotificationRepository(db).countUnreadByUser(memberId)).toBe(0);
    const logs = new ActivityLogRepository(db).findByProject(projectId);
    expect(logs.items.some((l) => l.action === 'comment_added')).toBe(true);
  });

  it('does not notify when the author comments on their own thread', () => {
    const thread = service.createThread(authorId, projectId, {
      title: 'T',
      bodyMd: 'b',
    });
    service.createComment(authorId, thread.id, 'self comment');
    expect(new NotificationRepository(db).countUnreadByUser(authorId)).toBe(0);
  });

  it('only the comment author can edit their comment', () => {
    const thread = service.createThread(authorId, projectId, {
      title: 'T',
      bodyMd: 'b',
    });
    const comment = service.createComment(memberId, thread.id, 'c');
    expect(() => service.updateComment(authorId, comment.id, 'hacked')).toThrow(
      ForbiddenError
    );
    expect(service.updateComment(memberId, comment.id, 'edited').bodyMd).toBe(
      'edited'
    );
  });

  it('admin can delete another member comment', () => {
    const thread = service.createThread(authorId, projectId, {
      title: 'T',
      bodyMd: 'b',
    });
    const comment = service.createComment(memberId, thread.id, 'c');
    service.deleteComment(authorId, comment.id); // authorId is admin
    expect(() => service.listComments(memberId, thread.id)).not.toThrow();
  });

  it('throws NotFoundError for a non-existent thread', () => {
    expect(() => service.getThread(memberId, 99999)).toThrow(NotFoundError);
  });
});
