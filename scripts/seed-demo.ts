/**
 * デモデータを一括投入するシードスクリプト。
 *
 * 使用方法:
 *   npm run seed            # ./data/app.db をリセットしてデモデータを投入
 *   SQLITE_PATH=./other.db npm run seed
 *
 * 注意: 既存のDBファイルとuploadsディレクトリを削除してから再作成します
 *       (デモ用途のため、冪等に再実行できるようにリセット方式を採用)。
 *
 * 投入内容: 管理者1名 + 一般ユーザー約29名、プロジェクト約15件、各プロジェクトに
 * 掲示板/チャット/ToDo/メモ/ファイル/カレンダー/マイルストーン/ミーティング/
 * 通知/アクティビティログを網羅(従来比 約5倍)。生成内容は固定シードで決定論的。
 */
import fs from 'node:fs';
import path from 'node:path';
import { SqliteDatabase } from '../lib/db/sqlite';
import { Migrator } from '../lib/db/migrator';
import { seedAll } from './seed/generators';

function resetStorage(dbPath: string, uploadsDir: string): void {
  for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  if (fs.existsSync(uploadsDir)) fs.rmSync(uploadsDir, { recursive: true });
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function main(): void {
  const dbPath = process.env.SQLITE_PATH ?? './data/app.db';
  const uploadsDir = process.env.UPLOADS_PATH ?? './data/uploads';

  console.log(`Resetting storage (db: ${dbPath}, uploads: ${uploadsDir})...`);
  resetStorage(dbPath, uploadsDir);

  const db = new SqliteDatabase(dbPath);
  new Migrator(
    db,
    path.join(process.cwd(), 'lib', 'db', 'migrations')
  ).migrate();

  console.log('Seeding demo data (~5x volume)...');
  const { userCount, projectCount } = seedAll(db, uploadsDir);

  db.close();

  console.log('\n=== Seed complete ===');
  console.log(`Users: ${userCount} | Projects: ${projectCount}`);
  console.log('\nLogin credentials:');
  console.log('  Admin:    admin@example.com / admin123   (system_admin)');
  console.log('  Users:    alice / bob / carol / dave @example.com / password');
  console.log('  Inactive: eve@example.com / password     (ログイン不可)');
  console.log('  Others:   <firstname>.<lastname>@example.com / password');
  console.log('\nStart the app with:  npm run dev   ->  http://localhost:3000');
}

main();
