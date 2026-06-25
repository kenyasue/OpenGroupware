import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTestDb } from '@/tests/helpers/db';
import { Migrator } from '@/lib/db/migrator';
import { SqliteDatabase } from '@/lib/db/sqlite';

function createTempMigrationsDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
}

function writeMigration(dir: string, filename: string, sql: string): void {
  fs.writeFileSync(path.join(dir, filename), sql, 'utf-8');
}

describe('Migrator', () => {
  let db: SqliteDatabase;
  let migrationsDir: string;

  beforeEach(() => {
    db = createTestDb();
    migrationsDir = createTempMigrationsDir();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(migrationsDir, { recursive: true, force: true });
  });

  it('creates the schema_migrations table', () => {
    writeMigration(
      migrationsDir,
      '001_init.sql',
      'CREATE TABLE sample (id INTEGER);'
    );
    const migrator = new Migrator(db, migrationsDir);

    migrator.migrate();

    const row = db.get<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
    );
    expect(row?.name).toBe('schema_migrations');
  });

  it('applies migration files in filename order', () => {
    writeMigration(
      migrationsDir,
      '002_second.sql',
      'CREATE TABLE second (id INTEGER);'
    );
    writeMigration(
      migrationsDir,
      '001_first.sql',
      'CREATE TABLE first (id INTEGER);'
    );
    const migrator = new Migrator(db, migrationsDir);

    migrator.migrate();

    const applied = migrator.getAppliedMigrations();
    expect(applied.map((m) => m.filename)).toEqual([
      '001_first.sql',
      '002_second.sql',
    ]);
    expect(
      db.get<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE name='first'"
      )
    ).not.toBeNull();
    expect(
      db.get<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE name='second'"
      )
    ).not.toBeNull();
  });

  it('skips already-applied migrations on subsequent runs', () => {
    writeMigration(
      migrationsDir,
      '001_init.sql',
      'CREATE TABLE sample (id INTEGER);'
    );
    const migrator = new Migrator(db, migrationsDir);

    migrator.migrate();
    expect(migrator.getAppliedMigrations()).toHaveLength(1);

    expect(() => migrator.migrate()).not.toThrow();
    expect(migrator.getAppliedMigrations()).toHaveLength(1);
  });

  it('rolls back and does not record a migration when its SQL fails', () => {
    writeMigration(
      migrationsDir,
      '001_bad.sql',
      'CREATE TABLE will_exist (id INTEGER); NOT A VALID STATEMENT;'
    );
    const migrator = new Migrator(db, migrationsDir);

    expect(() => migrator.migrate()).toThrow();

    expect(migrator.getAppliedMigrations()).toHaveLength(0);
    expect(
      db.get<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE name='will_exist'"
      )
    ).toBeNull();
  });

  it('returns applied migrations ordered by filename', () => {
    writeMigration(migrationsDir, '001_a.sql', 'CREATE TABLE a (id INTEGER);');
    writeMigration(migrationsDir, '002_b.sql', 'CREATE TABLE b (id INTEGER);');
    const migrator = new Migrator(db, migrationsDir);

    migrator.migrate();

    const applied = migrator.getAppliedMigrations();
    expect(applied).toHaveLength(2);
    expect(applied[0].filename).toBe('001_a.sql');
    expect(applied[1].filename).toBe('002_b.sql');
    expect(applied[0].applied_at).toBeTruthy();
  });

  it('only reads .sql files in the migrations directory', () => {
    writeMigration(
      migrationsDir,
      '001_real.sql',
      'CREATE TABLE real_t (id INTEGER);'
    );
    fs.writeFileSync(path.join(migrationsDir, 'README.md'), 'not a migration');
    const migrator = new Migrator(db, migrationsDir);

    migrator.migrate();

    expect(migrator.getAppliedMigrations().map((m) => m.filename)).toEqual([
      '001_real.sql',
    ]);
  });

  it('applies the real 001_initial.sql and creates all core tables', () => {
    const realMigrationsDir = path.join(
      process.cwd(),
      'lib',
      'db',
      'migrations'
    );
    const migrator = new Migrator(db, realMigrationsDir);

    migrator.migrate();

    const tables = db
      .query<{
        name: string;
      }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .map((t) => t.name);

    const expectedTables = [
      'activity_logs',
      'attachments',
      'board_comments',
      'board_threads',
      'calendar_events',
      'chat_messages',
      'file_assets',
      'meeting_members',
      'meetings',
      'milestones',
      'notifications',
      'project_members',
      'project_notes',
      'projects',
      'schema_migrations',
      'todo_columns',
      'todo_items',
      'users',
    ];
    for (const table of expectedTables) {
      expect(tables).toContain(table);
    }
    expect(migrator.getAppliedMigrations().map((m) => m.filename)).toEqual([
      '001_initial.sql',
      '002_attachments.sql',
      '003_todo_tags.sql',
      '004_user_prefs.sql',
    ]);
  });
});
