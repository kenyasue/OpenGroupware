import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { MeetingRepository } from '@/repositories/MeetingRepository';

describe('MeetingRepository', () => {
  let db: SqliteDatabase;
  let repo: MeetingRepository;
  let projectId: number;
  let userId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new MeetingRepository(db);
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

  function createMeeting(title: string, startAt: string, endAt: string) {
    return repo.create({
      projectId,
      title,
      startAt,
      endAt,
      createdById: userId,
    });
  }

  it('creates and finds a meeting', () => {
    const m = createMeeting('M', '2026-06-15T10:00:00', '2026-06-15T11:00:00');
    expect(repo.findById(m.id)?.title).toBe('M');
    expect(repo.findByProject(projectId)).toHaveLength(1);
  });

  it('excludes soft-deleted meetings', () => {
    const m = createMeeting('M', '2026-06-15T10:00:00', '2026-06-15T11:00:00');
    repo.delete(m.id);
    expect(repo.findById(m.id)).toBeNull();
    expect(repo.findByProject(projectId)).toHaveLength(0);
  });

  it('updates a meeting', () => {
    const m = createMeeting('M', '2026-06-15T10:00:00', '2026-06-15T11:00:00');
    expect(repo.update(m.id, { title: 'M2', minutesMd: 'mins' })?.title).toBe(
      'M2'
    );
    expect(repo.findById(m.id)?.minutesMd).toBe('mins');
  });

  it('adds and lists members', () => {
    const m = createMeeting('M', '2026-06-15T10:00:00', '2026-06-15T11:00:00');
    repo.addMember(m.id, userId);
    expect(repo.findMembersByMeeting(m.id)).toHaveLength(1);
    expect(repo.findMembersByMeeting(m.id)[0].status).toBe('invited');
  });

  it('removes a member', () => {
    const m = createMeeting('M', '2026-06-15T10:00:00', '2026-06-15T11:00:00');
    repo.addMember(m.id, userId);
    repo.removeMember(m.id, userId);
    expect(repo.findMembersByMeeting(m.id)).toHaveLength(0);
  });

  it('findMeetingsByUserInRange returns overlapping meetings and respects excludeMeetingId', () => {
    const m1 = createMeeting(
      'overlapping',
      '2026-06-15T10:00:00',
      '2026-06-15T11:00:00'
    );
    repo.addMember(m1.id, userId);
    const found = repo.findMeetingsByUserInRange(
      userId,
      '2026-06-15T10:30:00',
      '2026-06-15T11:30:00'
    );
    expect(found.map((m) => m.id)).toContain(m1.id);
    const excluded = repo.findMeetingsByUserInRange(
      userId,
      '2026-06-15T10:30:00',
      '2026-06-15T11:30:00',
      m1.id
    );
    expect(excluded.map((m) => m.id)).not.toContain(m1.id);
  });
});
