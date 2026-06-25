import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { Locale, Theme, User, UserRole, UserStatus } from '@/lib/types';

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  theme: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    theme: row.theme as Theme,
    locale: row.locale as Locale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  role?: UserRole;
  status?: UserStatus;
  theme?: Theme;
  locale?: Locale;
}

/**
 * usersテーブルへのデータアクセスを担うRepository。
 * 直接SQLiteライブラリを触らず、必ずSqliteDatabase経由でSQLを実行する。
 */
export class UserRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findById(id: number): User | null {
    const row = this.db.get<UserRow>('SELECT * FROM users WHERE id = @id', {
      id,
    });
    return row ? mapUser(row) : null;
  }

  findByEmail(email: string): User | null {
    const row = this.db.get<UserRow>(
      'SELECT * FROM users WHERE email = @email',
      { email }
    );
    return row ? mapUser(row) : null;
  }

  create(input: CreateUserInput): User {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO users (name, email, password_hash, avatar_url, role, status, created_at, updated_at)
       VALUES (@name, @email, @passwordHash, @avatarUrl, @role, @status, @createdAt, @updatedAt)`,
      {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        avatarUrl: null,
        role: input.role ?? 'member',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findById(Number(result.lastInsertRowid));
    if (!created) {
      throw new Error('Failed to create user');
    }
    return created;
  }

  update(id: number, input: UpdateUserInput): User | null {
    const fields: string[] = ['updated_at = @updatedAt'];
    const params: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      id,
    };

    if (input.name !== undefined) {
      fields.push('name = @name');
      params.name = input.name;
    }
    if (input.email !== undefined) {
      fields.push('email = @email');
      params.email = input.email;
    }
    if (input.avatarUrl !== undefined) {
      fields.push('avatar_url = @avatarUrl');
      params.avatarUrl = input.avatarUrl;
    }
    if (input.role !== undefined) {
      fields.push('role = @role');
      params.role = input.role;
    }
    if (input.status !== undefined) {
      fields.push('status = @status');
      params.status = input.status;
    }
    if (input.theme !== undefined) {
      fields.push('theme = @theme');
      params.theme = input.theme;
    }
    if (input.locale !== undefined) {
      fields.push('locale = @locale');
      params.locale = input.locale;
    }

    this.db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = @id`,
      params
    );
    return this.findById(id);
  }
}
