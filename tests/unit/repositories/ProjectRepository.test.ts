import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';

describe('ProjectRepository', () => {
  let db: SqliteDatabase;
  let userRepo: UserRepository;
  let repo: ProjectRepository;
  let memberRepo: ProjectMemberRepository;
  let ownerId: number;

  beforeEach(() => {
    db = createMigratedTestDb();
    userRepo = new UserRepository(db);
    repo = new ProjectRepository(db);
    memberRepo = new ProjectMemberRepository(db);
    ownerId = userRepo.create({
      name: 'Owner',
      email: 'owner@example.com',
      passwordHash: 'h',
    }).id;
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('creates a project with active status and returns it', () => {
      const project = repo.create({
        name: 'Project A',
        description: 'desc',
        ownerId,
      });

      expect(project.id).toBeGreaterThan(0);
      expect(project.name).toBe('Project A');
      expect(project.description).toBe('desc');
      expect(project.status).toBe('active');
      expect(project.ownerId).toBe(ownerId);
    });
  });

  describe('findById', () => {
    it('returns the project when found', () => {
      const created = repo.create({ name: 'P', ownerId });

      expect(repo.findById(created.id)?.name).toBe('P');
    });

    it('returns null when not found', () => {
      expect(repo.findById(99999)).toBeNull();
    });
  });

  describe('findByOwner', () => {
    it('returns projects owned by the user', () => {
      repo.create({ name: 'P1', ownerId });
      repo.create({ name: 'P2', ownerId });

      const owned = repo.findByOwner(ownerId);
      expect(owned).toHaveLength(2);
    });
  });

  describe('findProjectsByUserId', () => {
    it('returns only projects the user is a member of', () => {
      const p1 = repo.create({ name: 'P1', ownerId });
      const p2 = repo.create({ name: 'P2', ownerId });
      const other = userRepo.create({
        name: 'Other',
        email: 'other@example.com',
        passwordHash: 'h',
      }).id;

      memberRepo.add(p1.id, other, 'member');

      const projects = repo.findProjectsByUserId(other);
      expect(projects.map((p) => p.id)).toEqual([p1.id]);
      expect(projects.map((p) => p.id)).not.toContain(p2.id);
    });
  });

  describe('update', () => {
    it('updates name, description and status', () => {
      const created = repo.create({ name: 'P', ownerId });

      const updated = repo.update(created.id, {
        name: 'P2',
        description: 'new desc',
        status: 'archived',
      });

      expect(updated?.name).toBe('P2');
      expect(updated?.description).toBe('new desc');
      expect(updated?.status).toBe('archived');
    });

    it('returns null for a non-existent project', () => {
      expect(repo.update(99999, { name: 'X' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes the project and returns true', () => {
      const created = repo.create({ name: 'P', ownerId });

      expect(repo.delete(created.id)).toBe(true);
      expect(repo.findById(created.id)).toBeNull();
    });

    it('returns false when the project does not exist', () => {
      expect(repo.delete(99999)).toBe(false);
    });
  });
});
