import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { SqliteDatabase } from '@/lib/db/sqlite';

let counter = 0;

/**
 * テスト用の一時SQLite DBを作成する。
 * 実DB(一時ファイル)を使用し、テスト終了時に自動削除される。
 */
export function createTestDb(): SqliteDatabase {
  const tmpDir = os.tmpdir();
  const dbPath = path.join(
    tmpDir,
    `test-${process.pid}-${Date.now()}-${counter++}.db`
  );
  const db = new SqliteDatabase(dbPath);

  const originalClose = db.close.bind(db);
  db.close = () => {
    originalClose();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  };

  return db;
}

/**
 * マイグレーション済みのテスト用DBを作成する
 */
export function createMigratedTestDb(): SqliteDatabase {
  const db = createTestDb();
  const migrationsDir = path.join(process.cwd(), 'lib', 'db', 'migrations');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Migrator } = require('@/lib/db/migrator');
  const migrator = new Migrator(db, migrationsDir);
  migrator.migrate();
  return db;
}
