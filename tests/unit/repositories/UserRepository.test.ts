import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';

describe('UserRepository', () => {
  let db: SqliteDatabase;
  let repo: UserRepository;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new UserRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('creates a user and returns it with an id and active status', () => {
      const user = repo.create({
        name: 'Alice',
        email: 'alice@example.com',
        passwordHash: 'hashed',
      });

      expect(user.id).toBeGreaterThan(0);
      expect(user.name).toBe('Alice');
      expect(user.email).toBe('alice@example.com');
      expect(user.passwordHash).toBe('hashed');
      expect(user.role).toBe('member');
      expect(user.status).toBe('active');
      expect(user.createdAt).toBeTruthy();
    });

    it('rejects a duplicate email (UNIQUE constraint)', () => {
      repo.create({
        name: 'Alice',
        email: 'dup@example.com',
        passwordHash: 'h',
      });
      expect(() =>
        repo.create({
          name: 'Bob',
          email: 'dup@example.com',
          passwordHash: 'h',
        })
      ).toThrow();
    });
  });

  describe('findById', () => {
    it('returns the user when found', () => {
      const created = repo.create({
        name: 'Alice',
        email: 'a@example.com',
        passwordHash: 'h',
      });

      const found = repo.findById(created.id);

      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Alice');
    });

    it('returns null when no user exists for the id', () => {
      expect(repo.findById(99999)).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns the user matching the email', () => {
      repo.create({ name: 'Alice', email: 'a@example.com', passwordHash: 'h' });

      const found = repo.findByEmail('a@example.com');

      expect(found?.name).toBe('Alice');
    });

    it('returns null when no user matches the email', () => {
      expect(repo.findByEmail('nobody@example.com')).toBeNull();
    });
  });

  describe('update', () => {
    it('updates name, email, avatarUrl, role and status', () => {
      const created = repo.create({
        name: 'Alice',
        email: 'a@example.com',
        passwordHash: 'h',
      });

      const updated = repo.update(created.id, {
        name: 'Alice2',
        email: 'a2@example.com',
        avatarUrl: 'https://example.com/avatar.png',
        role: 'system_admin',
        status: 'inactive',
      });

      expect(updated?.name).toBe('Alice2');
      expect(updated?.email).toBe('a2@example.com');
      expect(updated?.avatarUrl).toBe('https://example.com/avatar.png');
      expect(updated?.role).toBe('system_admin');
      expect(updated?.status).toBe('inactive');
    });

    it('only updates provided fields', () => {
      const created = repo.create({
        name: 'Alice',
        email: 'a@example.com',
        passwordHash: 'h',
      });

      const updated = repo.update(created.id, { name: 'NewName' });

      expect(updated?.name).toBe('NewName');
      expect(updated?.email).toBe('a@example.com');
    });

    it('returns null when updating a non-existent user', () => {
      const result = repo.update(99999, { name: 'X' });
      // UPDATE affects 0 rows; findById returns null
      expect(result).toBeNull();
    });
  });
});
