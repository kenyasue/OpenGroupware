import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';

describe('NotificationRepository', () => {
  let db: SqliteDatabase;
  let repo: NotificationRepository;
  let userId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new NotificationRepository(db);
    userId = new UserRepository(db).create({
      name: 'U',
      email: 'u@example.com',
      passwordHash: 'h',
    }).id;
  });

  afterEach(() => db.close());

  it('creates a notification as unread', () => {
    const n = repo.create({
      userId,
      projectId: null,
      type: 'mention',
      title: 't',
      body: 'b',
    });
    expect(n.id).toBeGreaterThan(0);
    expect(n.readAt).toBeNull();
    expect(n.userId).toBe(userId);
  });

  it('lists unread notifications for the user (newest first) with total', () => {
    repo.create({
      userId,
      projectId: null,
      type: 'mention',
      title: '1',
      body: null,
    });
    repo.create({
      userId,
      projectId: null,
      type: 'mention',
      title: '2',
      body: null,
    });

    const result = repo.findUnreadByUser(userId, 1, 20);

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe('2');
  });

  it('excludes already-read notifications', () => {
    const n = repo.create({
      userId,
      projectId: null,
      type: 'mention',
      title: 'x',
      body: null,
    });
    repo.markRead(n.id, userId);

    expect(repo.findUnreadByUser(userId).total).toBe(0);
  });

  it('isolates notifications per user', () => {
    const other = new UserRepository(db).create({
      name: 'O',
      email: 'o@example.com',
      passwordHash: 'h',
    }).id;
    repo.create({
      userId,
      projectId: null,
      type: 'mention',
      title: 'mine',
      body: null,
    });
    repo.create({
      userId: other,
      projectId: null,
      type: 'mention',
      title: 'theirs',
      body: null,
    });

    expect(repo.findUnreadByUser(userId).total).toBe(1);
    expect(repo.findUnreadByUser(other).total).toBe(1);
  });

  it('paginates results', () => {
    for (let i = 0; i < 5; i++) {
      repo.create({
        userId,
        projectId: null,
        type: 'mention',
        title: `t${i}`,
        body: null,
      });
    }

    const page1 = repo.findUnreadByUser(userId, 1, 2);
    const page2 = repo.findUnreadByUser(userId, 2, 2);

    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page1.total).toBe(5);
  });

  it('countUnreadByUser returns the unread count', () => {
    repo.create({
      userId,
      projectId: null,
      type: 'mention',
      title: 'a',
      body: null,
    });
    repo.create({
      userId,
      projectId: null,
      type: 'mention',
      title: 'b',
      body: null,
    });
    expect(repo.countUnreadByUser(userId)).toBe(2);
  });

  it('markRead only affects the owner unread notification and returns true', () => {
    const n = repo.create({
      userId,
      projectId: null,
      type: 'mention',
      title: 'a',
      body: null,
    });
    expect(repo.markRead(n.id, userId)).toBe(true);
    // 二回目は既読済みなので false
    expect(repo.markRead(n.id, userId)).toBe(false);
  });

  it('markRead rejects other users (ownership scope)', () => {
    const other = new UserRepository(db).create({
      name: 'O',
      email: 'o@example.com',
      passwordHash: 'h',
    }).id;
    const n = repo.create({
      userId,
      projectId: null,
      type: 'mention',
      title: 'a',
      body: null,
    });

    expect(repo.markRead(n.id, other)).toBe(false);
    expect(repo.countUnreadByUser(userId)).toBe(1);
  });
});
