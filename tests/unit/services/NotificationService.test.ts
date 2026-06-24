import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { NotificationService } from '@/services/NotificationService';
import type { NotificationEvent, SseBroadcaster } from '@/lib/types';

describe('NotificationService', () => {
  let db: SqliteDatabase;
  let repo: NotificationRepository;
  let service: NotificationService;
  let userId: number;
  let projectId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new NotificationRepository(db);
    service = new NotificationService(repo);
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

  function makeEvent(
    type: NotificationEvent['type'],
    extra: Record<string, unknown>
  ): NotificationEvent {
    return {
      type,
      projectId,
      title: 'title',
      body: 'body',
      ...extra,
    } as NotificationEvent;
  }

  describe('resolveTargets', () => {
    it('mention → mentionedUserId', () => {
      expect(
        service.resolveTargets(makeEvent('mention', { mentionedUserId: 7 }))
      ).toEqual([7]);
    });
    it('todo_assigned → assigneeId', () => {
      expect(
        service.resolveTargets(makeEvent('todo_assigned', { assigneeId: 7 }))
      ).toEqual([7]);
    });
    it('todo_due_soon → assigneeId', () => {
      expect(
        service.resolveTargets(makeEvent('todo_due_soon', { assigneeId: 7 }))
      ).toEqual([7]);
    });
    it('meeting_invited → memberIds', () => {
      expect(
        service.resolveTargets(
          makeEvent('meeting_invited', { memberIds: [1, 2, 3] })
        )
      ).toEqual([1, 2, 3]);
    });
    it('board_commented → threadAuthorId', () => {
      expect(
        service.resolveTargets(
          makeEvent('board_commented', { threadAuthorId: 9 })
        )
      ).toEqual([9]);
    });
    it('project_added → addedUserId', () => {
      expect(
        service.resolveTargets(makeEvent('project_added', { addedUserId: 5 }))
      ).toEqual([5]);
    });
    it('file_shared → projectMemberIds', () => {
      expect(
        service.resolveTargets(
          makeEvent('file_shared', { projectMemberIds: [1, 2] })
        )
      ).toEqual([1, 2]);
    });
    it('note_updated → projectMemberIds', () => {
      expect(
        service.resolveTargets(
          makeEvent('note_updated', { projectMemberIds: [3, 4] })
        )
      ).toEqual([3, 4]);
    });
  });

  it('notifyOnEvent creates a notification per target user', () => {
    const other = new UserRepository(db).create({
      name: 'O',
      email: 'o@example.com',
      passwordHash: 'h',
    }).id;
    const created = service.notifyOnEvent(
      makeEvent('meeting_invited', { memberIds: [userId, other] })
    );

    expect(created).toHaveLength(2);
    expect(repo.countUnreadByUser(userId)).toBe(1);
    expect(repo.countUnreadByUser(other)).toBe(1);
  });

  it('notifyOnEvent broadcasts notification.created when a broadcaster is injected', () => {
    const broadcast = vi.fn();
    const broadcaster: SseBroadcaster = { broadcast };
    const withBroadcaster = new NotificationService(repo, broadcaster);

    withBroadcaster.notifyOnEvent(
      makeEvent('project_added', { addedUserId: userId })
    );

    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(broadcast).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: 'notification.created' })
    );
  });

  it('notifyOnEvent does not broadcast when projectId is null', () => {
    const broadcast = vi.fn();
    const withBroadcaster = new NotificationService(repo, { broadcast });
    const event: NotificationEvent = {
      type: 'mention',
      projectId: null,
      title: 't',
      body: null,
      mentionedUserId: userId,
    };

    withBroadcaster.notifyOnEvent(event);

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('listUnread / countUnread / markRead delegate to the repository', () => {
    const n = service.notifyOnEvent(
      makeEvent('mention', { mentionedUserId: userId })
    )[0];

    expect(service.countUnread(userId)).toBe(1);
    expect(service.listUnread(userId).total).toBe(1);
    expect(service.markRead(n.id, userId)).toBe(true);
    expect(service.countUnread(userId)).toBe(0);
  });
});
