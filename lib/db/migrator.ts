import fs from 'node:fs';
import path from 'node:path';
import { SqliteDatabase } from './sqlite';

/**
 * SQLファイルベースのMigration機構。
 * - Migrationファイルをファイル名順に実行する
 * - 実行済みファイルは再実行しない
 * - 1ファイルごとにトランザクションを張り、失敗時はロールバックする
 */
export class Migrator {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly migrationsDir: string
  ) {}

  /**
   * 未適用のMigrationをファイル名順に実行する
   */
  migrate(): void {
    this.ensureMigrationsTable();

    const applied = this.db.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const appliedSet = new Set(applied.map((x) => x.filename));

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;

      const fullPath = path.join(this.migrationsDir, file);
      const sql = fs.readFileSync(fullPath, 'utf-8');

      this.db.transaction(() => {
        this.db.exec(sql);
        this.db.execute(
          `INSERT INTO schema_migrations (filename, applied_at) VALUES (@filename, @appliedAt)`,
          { filename: file, appliedAt: new Date().toISOString() }
        );
      });
    }
  }

  /**
   * 適用済みMigration一覧を取得する
   */
  getAppliedMigrations(): { filename: string; applied_at: string }[] {
    this.ensureMigrationsTable();
    return this.db.query<{ filename: string; applied_at: string }>(
      'SELECT filename, applied_at FROM schema_migrations ORDER BY filename'
    );
  }

  private ensureMigrationsTable(): void {
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      )
    `);
  }
}
