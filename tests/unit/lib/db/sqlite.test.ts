import { describe, it, expect, afterEach } from 'vitest';
import { createTestDb } from '@/tests/helpers/db';
import { SqliteDatabase } from '@/lib/db/sqlite';

describe('SqliteDatabase', () => {
  let db: SqliteDatabase;

  afterEach(() => {
    if (db) db.close();
  });

  describe('constructor', () => {
    it('enables WAL journal mode', () => {
      db = createTestDb();
      const row = db.get<{ journal_mode: string }>('PRAGMA journal_mode');
      expect(row?.journal_mode).toBe('wal');
    });

    it('enables foreign key constraints', () => {
      db = createTestDb();
      const row = db.get<{ foreign_keys: number }>('PRAGMA foreign_keys');
      expect(row?.foreign_keys).toBe(1);
    });
  });

  describe('query', () => {
    it('returns multiple rows', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );
      db.execute("INSERT INTO items (name) VALUES ('a')");
      db.execute("INSERT INTO items (name) VALUES ('b')");

      const rows = db.query<{ id: number; name: string }>(
        'SELECT * FROM items ORDER BY id'
      );

      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('a');
      expect(rows[1].name).toBe('b');
    });

    it('returns an empty array when no rows match', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );

      const rows = db.query<{ id: number }>('SELECT * FROM items');

      expect(rows).toEqual([]);
    });

    it('binds named parameters', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );
      db.execute("INSERT INTO items (name) VALUES ('target')");
      db.execute("INSERT INTO items (name) VALUES ('other')");

      const rows = db.query<{ name: string }>(
        'SELECT * FROM items WHERE name = @name',
        { name: 'target' }
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('target');
    });
  });

  describe('get', () => {
    it('returns a single row when found', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );
      const { lastInsertRowid } = db.execute(
        "INSERT INTO items (name) VALUES ('x')"
      );

      const row = db.get<{ id: number; name: string }>(
        'SELECT * FROM items WHERE id = @id',
        { id: Number(lastInsertRowid) }
      );

      expect(row).not.toBeNull();
      expect(row?.name).toBe('x');
    });

    it('returns null when no row is found', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );

      const row = db.get<{ id: number }>('SELECT * FROM items WHERE id = @id', {
        id: 999,
      });

      expect(row).toBeNull();
    });
  });

  describe('execute', () => {
    it('returns changes and lastInsertRowid for an insert', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );

      const result = db.execute("INSERT INTO items (name) VALUES ('a')");

      expect(result.changes).toBe(1);
      expect(Number(result.lastInsertRowid)).toBeGreaterThan(0);
    });

    it('returns the number of affected rows for an update', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );
      db.execute("INSERT INTO items (name) VALUES ('a')");
      db.execute("INSERT INTO items (name) VALUES ('b')");

      const result = db.execute(
        'UPDATE items SET name = @name WHERE name = @old',
        { name: 'updated', old: 'a' }
      );

      expect(result.changes).toBe(1);
    });

    it('returns the number of deleted rows for a delete', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );
      db.execute("INSERT INTO items (name) VALUES ('a')");

      const result = db.execute('DELETE FROM items WHERE name = @name', {
        name: 'a',
      });

      expect(result.changes).toBe(1);
    });
  });

  describe('exec', () => {
    it('executes multiple semicolon-separated statements', () => {
      db = createTestDb();

      db.exec(`
        CREATE TABLE a (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE b (id INTEGER PRIMARY KEY, value INTEGER NOT NULL);
        INSERT INTO a (name) VALUES ('first');
        INSERT INTO b (value) VALUES (42);
      `);

      expect(db.get<{ name: string }>('SELECT name FROM a')?.name).toBe(
        'first'
      );
      expect(db.get<{ value: number }>('SELECT value FROM b')?.value).toBe(42);
    });

    it('handles SQL comments alongside statements', () => {
      db = createTestDb();

      db.exec(`
        -- this is a comment
        CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
        /* multi-line
           comment */
        INSERT INTO items (name) VALUES ('x');
      `);

      expect(db.query<{ name: string }>('SELECT name FROM items')).toHaveLength(
        1
      );
    });
  });

  describe('transaction', () => {
    it('commits changes when the callback succeeds', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );

      db.transaction(() => {
        db.execute("INSERT INTO items (name) VALUES ('a')");
        db.execute("INSERT INTO items (name) VALUES ('b')");
      });

      const rows = db.query<{ name: string }>(
        'SELECT * FROM items ORDER BY id'
      );
      expect(rows).toHaveLength(2);
    });

    it('rolls back changes when the callback throws', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );

      expect(() =>
        db.transaction(() => {
          db.execute("INSERT INTO items (name) VALUES ('a')");
          db.execute("INSERT INTO items (name) VALUES ('b')");
          throw new Error('boom');
        })
      ).toThrow('boom');

      const rows = db.query<{ name: string }>('SELECT * FROM items');
      expect(rows).toHaveLength(0);
    });

    it('returns the callback value', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );

      const result = db.transaction(() => {
        db.execute("INSERT INTO items (name) VALUES ('a')");
        return 'committed';
      });

      expect(result).toBe('committed');
    });
  });

  describe('foreign key enforcement', () => {
    it('rejects inserts that violate a foreign key constraint', () => {
      db = createTestDb();
      db.execute(
        'CREATE TABLE parents (id INTEGER PRIMARY KEY, name TEXT NOT NULL)'
      );
      db.execute(
        'CREATE TABLE children (id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL, FOREIGN KEY (parent_id) REFERENCES parents(id))'
      );

      expect(() =>
        db.execute('INSERT INTO children (parent_id) VALUES (@parentId)', {
          parentId: 999,
        })
      ).toThrow();
    });
  });
});
