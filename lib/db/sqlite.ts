import Database from 'better-sqlite3';

export type SqlParams = Record<string, unknown> | unknown[];

export interface ExecuteResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

/**
 * SQLiteへのアクセスを一元管理する共通SQLラッパー。
 * 各Repositoryは直接better-sqlite3を触らず、必ずこのクラスを通してSQLを実行する。
 */
export class SqliteDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * 複数行を取得するSELECT
   */
  query<T>(sql: string, params?: SqlParams): T[] {
    return this.db.prepare(sql).all(params ?? {}) as T[];
  }

  /**
   * 単一行を取得するSELECT（該当なしの場合はnull）
   */
  get<T>(sql: string, params?: SqlParams): T | null {
    const row = this.db.prepare(sql).get(params ?? {}) as T | undefined;
    return row ?? null;
  }

  /**
   * INSERT / UPDATE / DELETEを実行する（単一プリペアドステートメント）
   */
  execute(sql: string, params?: SqlParams): ExecuteResult {
    const result = this.db.prepare(sql).run(params ?? {});

    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  /**
   * 複数ステートメントを含むSQLを一括実行する（Migration用・パラメータバインド不可）。
   * better-sqlite3の exec() を利用し、セミコロン区切りの複数文・コメントを処理する。
   */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * トランザクション内でコールバックを実行する
   */
  transaction<T>(callback: () => T): T {
    const tx = this.db.transaction(callback);
    return tx();
  }

  /**
   * DB接続を閉じる
   */
  close(): void {
    this.db.close();
  }
}

let instance: SqliteDatabase | null = null;

/**
 * シングルトンのDB接続を取得する。
 * dbPathは process.env.SQLITE_PATH ?? "./data/app.db"
 */
export function getDb(): SqliteDatabase {
  if (!instance) {
    const dbPath = process.env.SQLITE_PATH ?? './data/app.db';
    instance = new SqliteDatabase(dbPath);
  }

  return instance;
}

/**
 * テスト用途: シングルトンインスタンスをリセットする
 */
export function resetDbInstance(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
