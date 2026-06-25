import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { CalendarRepository } from '@/repositories/CalendarRepository';

describe('CalendarRepository', () => {
  let db: SqliteDatabase;
  let repo: CalendarRepository;
  let projectId: number;
  let userId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new CalendarRepository(db);
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

  function createEvent(title: string, startAt: string) {
    return repo.create({
      projectId,
      title,
      type: 'custom',
      startAt,
      createdById: userId,
    });
  }

  it('creates and finds an event by id', () => {
    const e = createEvent('E', '2026-06-15T10:00:00');
    expect(repo.findEventById(e.id)?.title).toBe('E');
  });

  it('finds events in range and excludes out-of-range', () => {
    createEvent('in', '2026-06-15T10:00:00');
    createEvent('out', '2026-07-15T10:00:00');
    const events = repo.findByProjectInRange(
      projectId,
      '2026-06-01',
      '2026-06-30'
    );
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('in');
  });

  it('excludes soft-deleted events', () => {
    const e = createEvent('E', '2026-06-15T10:00:00');
    repo.delete(e.id);
    expect(repo.findEventById(e.id)).toBeNull();
    expect(
      repo.findByProjectInRange(projectId, '2026-06-01', '2026-06-30')
    ).toHaveLength(0);
  });

  it('isolates events by project', () => {
    createEvent('mine', '2026-06-15T10:00:00');
    const p2 = new ProjectRepository(db).create({
      name: 'P2',
      ownerId: userId,
    }).id;
    repo.create({
      projectId: p2,
      title: 'theirs',
      type: 'custom',
      startAt: '2026-06-15T10:00:00',
      createdById: userId,
    });
    expect(
      repo.findByProjectInRange(projectId, '2026-06-01', '2026-06-30')
    ).toHaveLength(1);
    expect(
      repo.findByProjectInRange(p2, '2026-06-01', '2026-06-30')
    ).toHaveLength(1);
  });

  it('updates an event', () => {
    const e = createEvent('E', '2026-06-15T10:00:00');
    expect(repo.update(e.id, { title: 'E2' })?.title).toBe('E2');
  });
});
