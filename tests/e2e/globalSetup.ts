import bcrypt from 'bcrypt';
import fs from 'node:fs';
import path from 'node:path';
import { SqliteDatabase } from '@/lib/db/sqlite';
import { Migrator } from '@/lib/db/migrator';
import { UserRepository } from '@/repositories/UserRepository';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

/**
 * E2E用の初期データをセットアップする。
 * - Migrationを確実に適用(開発サーバのmigrateと重複しても冪等)
 * - バックアップ/管理者機能のE2Eで使用する system_admin ユーザーを生成
 */
export default async function globalSetup(): Promise<void> {
  const dbPath = process.env.SQLITE_PATH ?? './data/app.db';
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new SqliteDatabase(dbPath);
  const migrationsDir = path.join(process.cwd(), 'lib', 'db', 'migrations');
  new Migrator(db, migrationsDir).migrate();

  const userRepo = new UserRepository(db);
  if (!userRepo.findByEmail(ADMIN_EMAIL)) {
    userRepo.create({
      name: 'Admin',
      email: ADMIN_EMAIL,
      passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
      role: 'system_admin',
    });
  }
  db.close();
}
