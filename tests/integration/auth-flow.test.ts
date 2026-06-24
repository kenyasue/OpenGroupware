import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMigratedTestDb } from '@/tests/helpers/db';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { UserRepository } from '@/repositories/UserRepository';
import { AuthService } from '@/services/AuthService';
import { verifySessionToken } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/errors';

describe('authentication flow (integration)', () => {
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

  it('registers, logs in, resolves the session, and reads the user', () => {
    // 1. 登録
    const registered = authService.register({
      name: 'Flow User',
      email: 'flow@example.com',
      password: 'password123',
    });
    expect(registered.id).toBeGreaterThan(0);

    // 2. ログイン → トークン発行
    const { user, token } = authService.login(
      'flow@example.com',
      'password123'
    );
    expect(user.id).toBe(registered.id);

    // 3. トークンからユーザーIDを解決(セッション復元)
    const resolvedUserId = verifySessionToken(token);
    expect(resolvedUserId).toBe(user.id);

    // 4. ユーザーIDから現在ユーザーを取得(getCurrentUser相当)
    const current = repo.findById(resolvedUserId!);
    expect(current?.email).toBe('flow@example.com');
  });

  it('rejects login after the account is deactivated', () => {
    authService.register({
      name: 'Flow User',
      email: 'flow@example.com',
      password: 'password123',
    });

    // 一度ログイン成功を確認
    expect(() =>
      authService.login('flow@example.com', 'password123')
    ).not.toThrow();

    // 無効化
    const user = repo.findByEmail('flow@example.com')!;
    repo.update(user.id, { status: 'inactive' });

    // 無効アカウントではログイン不可
    expect(() => authService.login('flow@example.com', 'password123')).toThrow(
      UnauthorizedError
    );
  });

  it('prevents a session token from resolving after profile email changes', () => {
    const created = authService.register({
      name: 'Flow User',
      email: 'flow@example.com',
      password: 'password123',
    });
    const { token } = authService.login('flow@example.com', 'password123');
    expect(verifySessionToken(token)).toBe(created.id);

    // プロフィール更新(メール変更)後もトークンはuidベースで有効
    authService.updateProfile(created.id, {
      email: 'changed@example.com',
      name: 'New Name',
    });

    const resolved = repo.findById(verifySessionToken(token)!);
    expect(resolved?.email).toBe('changed@example.com');
  });
});
