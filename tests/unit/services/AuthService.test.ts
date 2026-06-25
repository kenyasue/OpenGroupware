import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { AuthService } from '@/services/AuthService';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import { verifySessionToken } from '@/lib/auth/session';
import bcrypt from 'bcrypt';

describe('AuthService', () => {
  let db: SqliteDatabase;
  let repo: UserRepository;
  let authService: AuthService;

  beforeEach(() => {
    db = createMigratedTestDb();
    repo = new UserRepository(db);
    authService = new AuthService(repo);
  });

  afterEach(() => {
    db.close();
  });

  describe('register', () => {
    it('creates a user with a bcrypt-hashed password', () => {
      const user = authService.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
      });

      expect(user.id).toBeGreaterThan(0);
      expect(user.passwordHash).not.toBe('password123');
      expect(bcrypt.compareSync('password123', user.passwordHash!)).toBe(true);
      expect(user.role).toBe('member');
      expect(user.status).toBe('active');
    });

    it('throws ConflictError when the email is already registered', () => {
      authService.register({
        name: 'Alice',
        email: 'dup@example.com',
        password: 'password123',
      });

      expect(() =>
        authService.register({
          name: 'Bob',
          email: 'dup@example.com',
          password: 'password123',
        })
      ).toThrow(ConflictError);
    });

    it('throws ValidationError for a weak password', () => {
      expect(() =>
        authService.register({
          name: 'Alice',
          email: 'a@example.com',
          password: 'short',
        })
      ).toThrow();
    });
  });

  describe('login', () => {
    beforeEach(() => {
      authService.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
      });
    });

    it('returns the user and a verifiable session token on success', () => {
      const { user, token } = authService.login(
        'alice@example.com',
        'password123'
      );

      expect(user.email).toBe('alice@example.com');
      expect(verifySessionToken(token)).toBe(user.id);
    });

    it('throws UnauthorizedError when the password is wrong', () => {
      expect(() =>
        authService.login('alice@example.com', 'wrong-password')
      ).toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when the email does not exist', () => {
      expect(() =>
        authService.login('nobody@example.com', 'password123')
      ).toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when the account is inactive', () => {
      const user = repo.findByEmail('alice@example.com')!;
      repo.update(user.id, { status: 'inactive' });

      expect(() =>
        authService.login('alice@example.com', 'password123')
      ).toThrow(UnauthorizedError);
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user for a valid id', () => {
      const created = authService.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
      });

      expect(authService.getCurrentUser(created.id)?.email).toBe(
        'alice@example.com'
      );
    });

    it('returns null for an unknown id', () => {
      expect(authService.getCurrentUser(99999)).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('updates name and email', () => {
      const created = authService.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
      });

      const updated = authService.updateProfile(created.id, {
        name: 'Alice New',
        email: 'alice2@example.com',
      });

      expect(updated.name).toBe('Alice New');
      expect(updated.email).toBe('alice2@example.com');
    });

    it('throws ConflictError when changing email to one already in use', () => {
      authService.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
      });
      const bob = authService.register({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'password123',
      });

      expect(() =>
        authService.updateProfile(bob.id, { email: 'alice@example.com' })
      ).toThrow(ConflictError);
    });

    it('throws NotFoundError when the user does not exist', () => {
      expect(() => authService.updateProfile(99999, { name: 'X' })).toThrow(
        NotFoundError
      );
    });

    it('updates theme and locale', () => {
      const created = authService.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
      });
      const updated = authService.updateProfile(created.id, {
        theme: 'light',
        locale: 'ja',
      });
      expect(updated.theme).toBe('light');
      expect(updated.locale).toBe('ja');
    });

    it('rejects an invalid theme or locale', () => {
      const created = authService.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
      });
      expect(() =>
        authService.updateProfile(created.id, {
          theme: 'pink' as never,
        })
      ).toThrow(ValidationError);
      expect(() =>
        authService.updateProfile(created.id, {
          locale: 'fr' as never,
        })
      ).toThrow(ValidationError);
    });
  });

  describe('createWithRole', () => {
    it('creates a user with the specified role', () => {
      const admin = authService.createWithRole(
        { name: 'Admin', email: 'admin@example.com', password: 'password123' },
        'system_admin'
      );

      expect(admin.role).toBe('system_admin');
    });
  });
});
