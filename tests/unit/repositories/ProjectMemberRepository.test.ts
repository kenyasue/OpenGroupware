import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';

describe('ProjectMemberRepository', () => {
  let db: SqliteDatabase;
  let userRepo: UserRepository;
  let projectRepo: ProjectRepository;
  let repo: ProjectMemberRepository;
  let ownerId: number;
  let projectId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    userRepo = new UserRepository(db);
    projectRepo = new ProjectRepository(db);
    repo = new ProjectMemberRepository(db);
    ownerId = userRepo.create({
      name: 'Owner',
      email: 'owner@example.com',
      passwordHash: 'h',
    }).id;
    projectId = projectRepo.create({ name: 'P', ownerId }).id;
  });

  afterEach(() => {
    db.close();
  });

  describe('add / findByProject', () => {
    it('adds a member and lists them with user info', () => {
      repo.add(projectId, ownerId, 'admin');

      const members = repo.findByProject(projectId);
      expect(members).toHaveLength(1);
      expect(members[0].userId).toBe(ownerId);
      expect(members[0].role).toBe('admin');
      expect(members[0].user.email).toBe('owner@example.com');
    });

    it('rejects adding the same member twice (UNIQUE constraint)', () => {
      repo.add(projectId, ownerId, 'admin');
      expect(() => repo.add(projectId, ownerId, 'member')).toThrow();
    });
  });

  describe('isMember', () => {
    it('returns true for a member and false otherwise', () => {
      repo.add(projectId, ownerId, 'admin');

      expect(repo.isMember(projectId, ownerId)).toBe(true);
      expect(repo.isMember(projectId, 99999)).toBe(false);
    });
  });

  describe('getRole', () => {
    it('returns the role for a member', () => {
      repo.add(projectId, ownerId, 'admin');

      expect(repo.getRole(projectId, ownerId)).toBe('admin');
    });

    it('returns null for a non-member', () => {
      expect(repo.getRole(projectId, 99999)).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes a member and returns true', () => {
      repo.add(projectId, ownerId, 'admin');

      expect(repo.remove(projectId, ownerId)).toBe(true);
      expect(repo.isMember(projectId, ownerId)).toBe(false);
    });

    it('returns false when the member does not exist', () => {
      expect(repo.remove(projectId, 99999)).toBe(false);
    });
  });

  describe('findByUser', () => {
    it('returns memberships for a user across projects', () => {
      const other = userRepo.create({
        name: 'Other',
        email: 'other@example.com',
        passwordHash: 'h',
      }).id;
      const p2 = projectRepo.create({ name: 'P2', ownerId }).id;

      repo.add(projectId, other, 'member');
      repo.add(p2, other, 'admin');

      const memberships = repo.findByUser(other);
      expect(memberships).toHaveLength(2);
    });
  });
});
