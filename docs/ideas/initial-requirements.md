# シンプルグループウェア PRD

## 1. プロダクト概要

本プロダクトは、プロジェクト単位でチームの情報共有、タスク管理、ファイル共有、チャット、予定管理、ミーティング管理、Markdownメモ管理を行えるシンプルなグループウェアである。

すべての主要機能はプロジェクトに紐づき、プロジェクトごとに独立して利用できる。

---

## 2. 実装目的

今回実装する目的は以下である。

* ユーザーを管理できる
* プロジェクトを作成・管理できる
* プロジェクトごとにメンバーを管理できる
* プロジェクトごとに掲示板を使える
* プロジェクトごとにSSEチャットを使える
* プロジェクトごとにKanban形式のToDoを使える
* プロジェクトごとにファイル共有を使える
* ファイルをLightboxで閲覧できる
* プロジェクトごとにMarkdownメモを作成・編集・閲覧できる
* プロジェクトごとにカレンダーを使える
* カレンダーでマイルストーン、デッドライン、ToDo、ミーティングを表示できる
* プロジェクトごとにミーティングを管理できる
* ミーティング作成時に参加メンバーの予定重複を確認できる
* アプリ内通知を使える
* アクティビティログを記録できる
* SQLiteのDBスキーマをSQL Migrationで更新できる
* 管理者がバックアップを作成できる

---

## 3. システム要件

## 3.1 技術スタック

* フレームワーク: Next.js 15
* 言語: TypeScript
* データベース: SQLite
* SQLiteライブラリ: better-sqlite3
* ORM: 使用しない
* DBアクセス: 独自SQLラッパー + Repositoryクラス
* Migration: 独自SQL Migration
* 認証: 独自ログイン方式
* リアルタイム通信: SSE / Server-Sent Events
* ファイル保存: ローカルファイルシステム
* UI: Tailwind CSS
* Markdown表示:

  * react-markdown
  * remark-gfm
  * rehype-sanitize
* ファイル閲覧: Lightbox UI
* カレンダーUI: FullCalendar系、または独自実装
* 実行環境: Node.js runtime

---

## 3.2 Runtime方針

SQLiteを直接扱うため、Next.jsのEdge Runtimeは使用しない。

API Route、Server Actions、DBアクセス処理はすべてNode.js Runtimeで実行する。

---

## 3.3 Prismaは使用しない

本プロジェクトでは Prisma は使用しない。

DBアクセスは、独自SQLラッパーとRepositoryクラスで実装する。

---

## 4. 基本設計方針

## 4.1 DBアクセス構成

DBアクセスは以下の流れに統一する。

```txt id="w9oyj5"
Route Handler / Server Action
  ↓
Repository Class
  ↓
SQL Wrapper
  ↓
SQLite
```

各Repositoryは直接SQLiteライブラリを触らず、必ず共通SQLラッパーを通してSQLを実行する。

---

## 4.2 ディレクトリ構成

```txt id="n6ttjw"
app/
  api/
  login/
  dashboard/
  projects/
    [projectId]/

lib/
  db/
    sqlite.ts
    migrator.ts
    migrations/
      001_initial.sql

repositories/
  UserRepository.ts
  ProjectRepository.ts
  ProjectMemberRepository.ts
  BoardRepository.ts
  ChatRepository.ts
  TodoRepository.ts
  FileRepository.ts
  CalendarRepository.ts
  MeetingRepository.ts
  ProjectNoteRepository.ts
  NotificationRepository.ts
  ActivityLogRepository.ts

services/
  AuthService.ts
  ProjectService.ts
  ChatService.ts
  MeetingService.ts
  ScheduleService.ts
  FileStorageService.ts
  BackupService.ts

components/
  layout/
  project/
  board/
  chat/
  todo/
  files/
  calendar/
  meetings/
  notes/
  notifications/
```

---

## 5. SQL実行ラッパー

## 5.1 概要

SQLiteへのアクセスは、すべて共通のSQLラッパーを通して行う。

このラッパーは以下を担当する。

* SELECT複数行取得
* SELECT単一行取得
* INSERT / UPDATE / DELETE実行
* トランザクション
* SQLite初期設定
* 接続の共通管理
* エラー処理

---

## 5.2 lib/db/sqlite.ts

```ts id="fc6ykr"
import Database from "better-sqlite3";

export type SqlParams = Record<string, unknown> | unknown[];

export class SqliteDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);

    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  query<T>(sql: string, params?: SqlParams): T[] {
    return this.db.prepare(sql).all(params ?? {}) as T[];
  }

  get<T>(sql: string, params?: SqlParams): T | null {
    const row = this.db.prepare(sql).get(params ?? {}) as T | undefined;
    return row ?? null;
  }

  execute(
    sql: string,
    params?: SqlParams
  ): {
    changes: number;
    lastInsertRowid: number | bigint;
  } {
    const result = this.db.prepare(sql).run(params ?? {});

    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  transaction<T>(callback: () => T): T {
    const tx = this.db.transaction(callback);
    return tx();
  }

  close(): void {
    this.db.close();
  }
}

let instance: SqliteDatabase | null = null;

export function getDb(): SqliteDatabase {
  if (!instance) {
    const dbPath = process.env.SQLITE_PATH ?? "./data/app.db";
    instance = new SqliteDatabase(dbPath);
  }

  return instance;
}
```

---

## 6. SQL Migration

## 6.1 概要

DBスキーマ更新は、SQLファイルベースの独自Migrationで実装する。

Migrationファイルは `lib/db/migrations` に配置する。

実行済みのMigrationは `schema_migrations` テーブルで管理する。

---

## 6.2 Migration要件

* SQLファイルはファイル名順に実行する
* 実行済みファイルは再実行しない
* 実行済み履歴は `schema_migrations` テーブルに保存する
* 1ファイルごとにトランザクションを張る
* 失敗時はロールバックする
* 管理者がMigration状態を確認できる

---

## 6.3 schema_migrations テーブル

```sql id="qu74bt"
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);
```

---

## 6.4 migrator.ts

```ts id="ucf68u"
import fs from "node:fs";
import path from "node:path";
import { SqliteDatabase } from "./sqlite";

export class Migrator {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly migrationsDir: string
  ) {}

  migrate(): void {
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      )
    `);

    const applied = this.db.query<{ filename: string }>(`
      SELECT filename
      FROM schema_migrations
    `);

    const appliedSet = new Set(applied.map((x) => x.filename));

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;

      const fullPath = path.join(this.migrationsDir, file);
      const sql = fs.readFileSync(fullPath, "utf-8");

      this.db.transaction(() => {
        this.db.execute(sql);

        this.db.execute(
          `
          INSERT INTO schema_migrations (
            filename,
            applied_at
          )
          VALUES (
            @filename,
            @appliedAt
          )
          `,
          {
            filename: file,
            appliedAt: new Date().toISOString(),
          }
        );
      });
    }
  }
}
```

---

## 7. Repository設計

## 7.1 概要

テーブルごとにRepositoryクラスを作成する。

RepositoryはSQLを直接保持し、共通DBラッパーを通して実行する。

---

## 7.2 Repository一覧

* UserRepository
* ProjectRepository
* ProjectMemberRepository
* BoardRepository
* ChatRepository
* TodoRepository
* FileRepository
* CalendarRepository
* MeetingRepository
* ProjectNoteRepository
* NotificationRepository
* ActivityLogRepository

---

## 8. 基本コンセプト

すべての主要機能は「プロジェクト」に紐づく。

プロジェクトごとに以下が独立して存在する。

* メンバー
* 権限
* 掲示板
* チャット
* ToDo / Kanban
* ファイル
* カレンダー
* マイルストーン
* デッドライン
* ミーティング
* Markdownメモ
* 通知
* アクティビティログ

ユーザーは複数のプロジェクトに参加できる。

---

## 9. 機能要件

---

# 9.1 ユーザー管理

## 概要

システムを利用するユーザーを管理する。

## 実装内容

* ユーザー登録
* ログイン
* ログアウト
* パスワードログイン
* プロフィール編集
* アイコン画像設定
* 表示名設定
* メールアドレス管理
* アカウント有効 / 無効
* ロール管理

## ロール

* System Admin
* Project Admin
* Member
* Guest

---

# 9.2 プロジェクト管理

## 概要

プロジェクトを作成・管理する。

## 実装内容

* プロジェクト作成
* プロジェクト名編集
* 説明文編集
* ステータス管理
* メンバー追加
* メンバー削除
* プロジェクト内ロール設定
* プロジェクトアーカイブ
* プロジェクト削除
* プロジェクト別ダッシュボード

## プロジェクトステータス

* Active
* On Hold
* Completed
* Archived

## プロジェクトダッシュボード表示項目

* 最新チャット
* 最新掲示板投稿
* 最新Markdownメモ
* 未完了ToDo
* 期限が近いToDo
* 次回ミーティング
* 直近のマイルストーン
* 最近アップロードされたファイル
* 最近のアクティビティ

---

# 9.3 掲示板

## 概要

プロジェクト単位で非リアルタイムの情報共有を行う。

## 実装内容

* スレッド作成
* スレッド編集
* スレッド削除
* Markdown本文投稿
* コメント作成
* コメント編集
* コメント削除
* 添付ファイル
* 投稿のピン留め
* 重要マーク
* 既読管理
* カテゴリ分類
* 検索

## カテゴリ

* お知らせ
* 仕様
* 議事録
* 質問
* 決定事項
* トラブル
* メモ

---

# 9.4 チャット

## 概要

プロジェクト内でリアルタイムに短い会話を行う。

リアルタイム通信にはSSEを利用する。

## 実装内容

* プロジェクト別チャット
* メッセージ送信
* SSEによるリアルタイム受信
* メッセージ編集
* メッセージ削除
* 添付ファイル
* メンション
* リアクション
* 既読 / 未読
* チャット履歴検索

## SSE要件

* クライアントはプロジェクトごとのSSEエンドポイントに接続する
* 新規メッセージ作成時にプロジェクト参加メンバーへイベント配信する
* 接続切断時の自動再接続に対応する
* SSEイベントはプロジェクト単位で配信する

## SSEイベント

* `chat.message.created`
* `chat.message.updated`
* `chat.message.deleted`
* `todo.updated`
* `file.uploaded`
* `meeting.created`
* `note.updated`
* `notification.created`

---

# 9.5 ToDo / Kanban

## 概要

プロジェクトごとのタスクをKanban形式で管理する。

## 実装内容

* Kanbanボード表示
* カラム作成
* カラム編集
* カラム削除
* カラム並び替え
* タスク作成
* タスク編集
* タスク削除
* タスクのドラッグ&ドロップ
* 担当者設定
* 期限設定
* 優先度設定
* ラベル設定
* チェックリスト
* コメント
* 添付ファイル
* 完了状態管理
* カレンダーへの表示
* マイルストーンとの紐づけ

## 標準カラム

* Backlog
* To Do
* In Progress
* Review
* Done

---

# 9.6 ファイル共有

## 概要

プロジェクト内でファイルをアップロード、閲覧、共有する。

画像やPDFはLightboxで確認できるようにする。

## 実装内容

* ファイルアップロード
* ファイル一覧
* フォルダ管理
* ファイル名変更
* ファイル削除
* ダウンロード
* プレビュー
* Lightbox表示
* 画像プレビュー
* PDFプレビュー
* ファイルコメント
* ファイルとToDoの紐づけ
* ファイルと掲示板投稿の紐づけ
* ファイルとミーティングの紐づけ
* ファイルとMarkdownメモの紐づけ

## ファイル保存

アップロードされたファイルはローカルファイルシステムに保存する。

---

# 9.7 Markdownメモ

## 概要

プロジェクトごとにMarkdown形式のメモを作成・編集・閲覧できる。

## 実装内容

* Markdownメモ作成
* Markdownメモ編集
* Markdownメモ削除
* Markdownプレビュー
* タイトル設定
* タグ設定
* ピン留め
* 検索
* 更新日時表示
* 作成者表示
* 最終更新者表示
* ファイル添付
* 関連ToDo設定
* 関連ミーティング設定

## 画面構成

プロジェクト内に「メモ」メニューを追加する。

```txt id="io9zsz"
プロジェクト
  - 概要
  - 掲示板
  - チャット
  - ToDo
  - ファイル
  - メモ
  - カレンダー
  - ミーティング
  - メンバー
  - 設定
```

## Markdown対応記法

* 見出し
* 箇条書き
* 番号リスト
* チェックリスト
* コードブロック
* テーブル
* リンク
* 画像
* 引用

## Markdownセキュリティ

* HTMLの直接入力は無効にする
* Markdown表示時にサニタイズする
* 危険なURLスキームを除外する

---

# 9.8 カレンダー

## 概要

プロジェクト内の予定、マイルストーン、ToDo期限、ミーティングをカレンダー上で確認する。

## 実装内容

* 月表示
* 週表示
* 日表示
* リスト表示
* マイルストーン表示
* ToDo期限表示
* デッドライン表示
* ミーティング表示
* イベント作成
* イベント編集
* イベント削除
* メンバー別フィルター
* 種別フィルター

## 表示対象

* マイルストーン
* デッドライン
* ToDo開始日
* ToDo期限
* ミーティング
* 任意イベント

## カレンダーイベント種別

* Meeting
* Deadline
* Milestone
* Todo
* Reminder
* Custom

---

# 9.9 マイルストーン管理

## 概要

プロジェクトの重要な節目を管理する。

## 実装内容

* マイルストーン作成
* マイルストーン編集
* マイルストーン削除
* 期限設定
* 説明文
* 関連ToDo
* 進捗率表示
* 完了状態管理
* カレンダー表示

## 進捗率

関連ToDoの完了率から自動計算する。

---

# 9.10 ミーティング管理

## 概要

プロジェクトメンバーとのミーティングを設定し、参加者の予定重複を確認できるようにする。

## 実装内容

* ミーティング作成
* ミーティング編集
* ミーティング削除
* タイトル設定
* 説明設定
* 開始日時設定
* 終了日時設定
* 参加メンバー設定
* 場所設定
* ミーティングURL設定
* アジェンダ作成
* 議事録作成
* 関連ToDo設定
* 関連ファイル設定
* 関連掲示板投稿設定
* 関連Markdownメモ設定
* カレンダー表示
* 参加者の予定重複チェック

## スケジュール重複確認

ミーティング作成時に、選択されたメンバーの予定を確認し、同じ時間帯に以下がある場合は警告する。

* 他のミーティング
* カレンダーイベント
* 期限の近い重要タスク

---

# 9.11 通知

## 概要

ユーザーが重要な更新を見逃さないようにアプリ内通知を表示する。

## 実装内容

* アプリ内通知
* 未読通知一覧
* 通知既読化
* メンション通知
* ToDo担当者通知
* 期限前通知
* ミーティング通知
* 掲示板コメント通知
* ファイル共有通知
* Markdownメモ更新通知

## 通知対象イベント

* 自分がメンションされた
* 自分にToDoが割り当てられた
* ToDoの期限が近い
* ミーティングに招待された
* 掲示板にコメントが付いた
* プロジェクトに追加された
* ファイルが共有された
* Markdownメモが更新された

---

# 9.12 検索

## 概要

プロジェクト内の情報を横断検索できるようにする。

## 実装内容

* 掲示板検索
* チャット検索
* ToDo検索
* ファイル名検索
* カレンダーイベント検索
* ミーティング検索
* 議事録検索
* マイルストーン検索
* Markdownメモ検索

## 検索条件

* キーワード
* 投稿者
* 担当者
* 日付
* 種別
* プロジェクト
* タグ

---

# 9.13 アクティビティログ

## 概要

プロジェクト内の変更履歴を時系列で確認できるようにする。

## 実装内容

以下の操作をアクティビティログに記録する。

* ToDo作成
* ToDo更新
* ToDo完了
* ファイルアップロード
* 掲示板投稿
* コメント追加
* Markdownメモ作成
* Markdownメモ更新
* ミーティング作成
* メンバー追加
* マイルストーン更新

---

# 9.14 ダッシュボード

## 概要

ログイン後、ユーザーが自分に関係する情報を確認できる画面。

## 個人ダッシュボード

* 自分の参加プロジェクト
* 自分の未完了ToDo
* 今日の予定
* 近日中のミーティング
* 未読通知
* 期限切れタスク
* 最近のアクティビティ

## プロジェクトダッシュボード

* プロジェクト概要
* 進行中ToDo
* 期限が近いToDo
* 最新チャット
* 最新掲示板
* 最新Markdownメモ
* 最近のファイル
* 次回ミーティング
* マイルストーン進捗

---

# 9.15 バックアップ

## 概要

管理者がSQLite DBファイルとアップロードファイルをバックアップできるようにする。

## 実装内容

* 管理者用バックアップ画面
* SQLite DBファイルのバックアップ作成
* uploadsディレクトリのバックアップ作成
* DBとuploadsをZIP化
* バックアップファイル一覧
* バックアップファイルのダウンロード

---

## 10. データモデル

---

# 10.1 users

```sql id="m7rh00"
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

# 10.2 projects

```sql id="m311sl"
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  owner_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

---

# 10.3 project_members

```sql id="3cxg81"
CREATE TABLE project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL,
  UNIQUE(project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

# 10.4 board_threads

```sql id="z6c9p0"
CREATE TABLE board_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  author_id INTEGER NOT NULL,
  category TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_important INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);
```

---

# 10.5 board_comments

```sql id="jipxxm"
CREATE TABLE board_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  body_md TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (thread_id) REFERENCES board_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);
```

---

# 10.6 chat_messages

```sql id="jlb7fd"
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);
```

---

# 10.7 todo_columns

```sql id="zsqljm"
CREATE TABLE todo_columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

# 10.8 todo_items

```sql id="yodc8g"
CREATE TABLE todo_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  column_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id INTEGER,
  creator_id INTEGER NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  start_date TEXT,
  due_date TEXT,
  completed_at TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  milestone_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (column_id) REFERENCES todo_columns(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  FOREIGN KEY (creator_id) REFERENCES users(id)
);
```

---

# 10.9 file_assets

```sql id="dgg8hv"
CREATE TABLE file_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  uploader_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (uploader_id) REFERENCES users(id)
);
```

---

# 10.10 project_notes

```sql id="9lcozm"
CREATE TABLE project_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  tags TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_by_id INTEGER NOT NULL,
  updated_by_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES users(id),
  FOREIGN KEY (updated_by_id) REFERENCES users(id)
);

CREATE INDEX idx_project_notes_project_id
ON project_notes(project_id);

CREATE INDEX idx_project_notes_updated_at
ON project_notes(updated_at);
```

---

# 10.11 milestones

```sql id="mzbyj4"
CREATE TABLE milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

# 10.12 calendar_events

```sql id="8xm6fu"
CREATE TABLE calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  created_by_id INTEGER NOT NULL,
  related_todo_id INTEGER,
  related_milestone_id INTEGER,
  related_meeting_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

---

# 10.13 meetings

```sql id="tr4c4g"
CREATE TABLE meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  meeting_url TEXT,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  agenda_md TEXT,
  minutes_md TEXT,
  created_by_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);
```

---

# 10.14 meeting_members

```sql id="exqmtd"
CREATE TABLE meeting_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  UNIQUE(meeting_id, user_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

# 10.15 notifications

```sql id="49ezwr"
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_id INTEGER,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

# 10.16 activity_logs

```sql id="u6r17e"
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  actor_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id)
);
```

---

## 11. 画面構成

## 11.1 共通画面

* ログイン画面
* ダッシュボード
* 通知一覧
* ユーザープロフィール
* 管理者設定
* バックアップ管理

---

## 11.2 プロジェクト内画面

* プロジェクト概要
* 掲示板
* チャット
* ToDo / Kanban
* ファイル
* Markdownメモ
* カレンダー
* マイルストーン
* ミーティング
* メンバー
* アクティビティログ
* 設定

---

## 12. 非機能要件

## 12.1 パフォーマンス

* 1プロジェクトあたり数十人規模を想定する
* チャットSSEは小規模同時接続を前提とする
* ファイル一覧、チャット履歴、掲示板、Markdownメモはページネーションを行う
* 一覧取得では必要な件数だけ取得する

---

## 12.2 セキュリティ

* 認証必須
* プロジェクト参加者以外はプロジェクト情報にアクセス不可
* ファイルアクセスにも権限チェックを行う
* SQLはパラメータバインドで実行する
* Markdown表示時はHTMLを無効化しサニタイズする
* アップロードファイルのMIMEチェックを行う
* 管理者操作をアクティビティログに記録する

---

## 12.3 バックアップ

* SQLite DBファイルをバックアップできる
* uploadsディレクトリをバックアップできる
* DBとuploadsをZIP化できる
* バックアップファイルをダウンロードできる

---

## 12.4 運用

* `.env` で設定管理できる
* SQLite DBファイルを永続化する
* uploadsディレクトリを永続化する
* 管理者がDB Migration状態を確認できる
* 管理者がバックアップを作成できる

---

## 13. 開発順序

## Phase 1: 基盤

* Next.js 15セットアップ
* Tailwind CSSセットアップ
* SQLite接続
* SQLラッパー実装
* Migration実装
* Repository基盤作成
* 認証
* ユーザー管理
* プロジェクト管理
* プロジェクトメンバー管理

---

## Phase 2: プロジェクト内基本機能

* プロジェクトダッシュボード
* 掲示板
* Markdownメモ
* アクティビティログ
* 通知

---

## Phase 3: リアルタイム・タスク管理

* SSE基盤
* チャット
* ToDo / Kanban
* メンション
* 既読 / 未読

---

## Phase 4: ファイル・カレンダー

* ファイル共有
* Lightbox
* カレンダー
* マイルストーン
* デッドライン表示

---

## Phase 5: ミーティング・バックアップ

* ミーティング作成
* メンバー設定
* スケジュール重複チェック
* 議事録
* ToDo連携
* Markdownメモ連携
* バックアップ管理

---

## 14. 成功条件

* ユーザーがログインできる
* ユーザーを管理できる
* プロジェクトを作成できる
* プロジェクトにメンバーを追加できる
* プロジェクトごとに掲示板を使える
* プロジェクトごとにチャットを使える
* チャットがSSEでリアルタイム更新される
* プロジェクトごとにKanban ToDoを使える
* プロジェクトごとにファイルをアップロードできる
* ファイルをLightboxで閲覧できる
* プロジェクトごとにMarkdownメモを作成・編集・閲覧できる
* カレンダーにToDo、マイルストーン、デッドライン、ミーティングが表示される
* ミーティングを作成できる
* ミーティング参加者の予定重複が分かる
* アプリ内通知が表示される
* アクティビティログが記録される
* SQL Migrationが実行できる
* 管理者がDBとuploadsのバックアップを作成できる

---

## 15. まとめ

本プロダクトは、Next.js 15、TypeScript、SQLite、better-sqlite3で構築するシンプルなプロジェクト型グループウェアである。

Prismaは使用せず、独自SQLラッパーとRepositoryクラスでDBアクセスを実装する。

DB更新はSQLファイルベースの独自Migrationで管理する。

今回実装する機能は、ユーザー管理、プロジェクト管理、掲示板、SSEチャット、Kanban ToDo、ファイル共有、Lightbox、Markdownメモ、カレンダー、マイルストーン、ミーティング管理、通知、アクティビティログ、バックアップである。

すべての主要機能はプロジェクトに紐づき、プロジェクトごとに独立して利用できる。

## 3.4 テスト要件

本プロジェクトでは、Unit Test と E2E Test を実装する。

## Unit Test

Unit Test は、主に以下を対象とする。

* SQLラッパー
* Migration
* Repositoryクラス
* Serviceクラス
* 権限チェック
* バリデーション
* スケジュール重複判定
* 通知作成ロジック
* アクティビティログ作成ロジック

## E2E Test

E2E Test は Playwright を使用して実装する。

E2E Test は、実際のブラウザ操作を通して、主要なユーザーフローが正しく動作することを確認する。

## テストライブラリ

* Unit Test: Vitest
* E2E Test: Playwright

---

## 9.16 テスト

## 概要

今回実装する全機能について、Unit Test と PlaywrightによるE2E Testを作成する。

## Unit Test実装内容

Unit Testでは、UIではなくロジック単位の動作を確認する。

対象:

* SQLラッパー
* Migration実行
* UserRepository
* ProjectRepository
* ProjectMemberRepository
* BoardRepository
* ChatRepository
* TodoRepository
* FileRepository
* CalendarRepository
* MeetingRepository
* ProjectNoteRepository
* NotificationRepository
* ActivityLogRepository
* AuthService
* ProjectService
* ChatService
* MeetingService
* ScheduleService
* FileStorageService
* BackupService

確認内容:

* 正常にデータを作成できる
* 正常にデータを取得できる
* 正常にデータを更新できる
* 正常にデータを削除できる
* 論理削除されたデータが通常取得に含まれない
* プロジェクト単位でデータが分離される
* 権限がないユーザーは操作できない
* 必須項目が不足している場合はエラーになる
* Migrationがファイル名順に実行される
* 実行済みMigrationが再実行されない
* 予定が重複している場合に検出できる
* 通知が正しいユーザーに作成される
* アクティビティログが正しく記録される

## E2E Test実装内容

E2E Testでは、Playwrightを使用して実際の画面操作を検証する。

対象フロー:

### 認証

* ユーザーがログインできる
* ユーザーがログアウトできる
* ログインしていないユーザーは保護された画面にアクセスできない

### プロジェクト管理

* プロジェクトを作成できる
* プロジェクト名を編集できる
* プロジェクトにメンバーを追加できる
* プロジェクトからメンバーを削除できる
* プロジェクトをアーカイブできる

### 掲示板

* 掲示板スレッドを作成できる
* 掲示板スレッドを編集できる
* 掲示板スレッドにコメントできる
* 掲示板スレッドを検索できる

### チャット

* チャットメッセージを送信できる
* 別ブラウザ、または別コンテキストでSSEによりメッセージがリアルタイム表示される
* チャットメッセージを編集できる
* チャットメッセージを削除できる

### ToDo / Kanban

* ToDoカラムを作成できる
* ToDoタスクを作成できる
* ToDoタスクを編集できる
* ToDoタスクを別カラムへ移動できる
* ToDoタスクに担当者と期限を設定できる
* 完了したToDoがDoneカラムに表示される

### ファイル共有

* ファイルをアップロードできる
* ファイル一覧に表示される
* 画像ファイルをLightboxで閲覧できる
* PDFファイルをプレビューできる
* ファイルを削除できる

### Markdownメモ

* Markdownメモを作成できる
* Markdown本文を編集できる
* Markdownプレビューが表示される
* Markdownメモをピン留めできる
* Markdownメモを検索できる
* Markdownメモを削除できる

### カレンダー

* カレンダーにToDo期限が表示される
* カレンダーにマイルストーンが表示される
* カレンダーにミーティングが表示される
* カレンダーイベントを作成できる
* カレンダーイベントを編集できる

### ミーティング

* ミーティングを作成できる
* ミーティングに参加メンバーを設定できる
* 参加メンバーの予定重複が画面上で警告される
* アジェンダを入力できる
* 議事録を入力できる
* ミーティングをToDoやMarkdownメモに関連付けできる

### 通知

* ToDo担当者に通知が表示される
* メンションされたユーザーに通知が表示される
* ミーティング参加者に通知が表示される
* 通知を既読にできる

### アクティビティログ

* ToDo作成がログに記録される
* ファイルアップロードがログに記録される
* Markdownメモ更新がログに記録される
* ミーティング作成がログに記録される

### バックアップ

* 管理者がバックアップを作成できる
* バックアップ一覧に作成済みバックアップが表示される
* バックアップファイルをダウンロードできる

---

## 14. 成功条件 / 受け入れ要件

* ユーザーがログインできる
* ユーザーを管理できる
* プロジェクトを作成できる
* プロジェクトにメンバーを追加できる
* プロジェクトごとに掲示板を使える
* プロジェクトごとにチャットを使える
* チャットがSSEでリアルタイム更新される
* プロジェクトごとにKanban ToDoを使える
* プロジェクトごとにファイルをアップロードできる
* ファイルをLightboxで閲覧できる
* プロジェクトごとにMarkdownメモを作成・編集・閲覧できる
* カレンダーにToDo、マイルストーン、デッドライン、ミーティングが表示される
* ミーティングを作成できる
* ミーティング参加者の予定重複が分かる
* アプリ内通知が表示される
* アクティビティログが記録される
* SQL Migrationが実行できる
* 管理者がDBとuploadsのバックアップを作成できる
* Unit Testが実装されている
* Repository、Service、Migration、SQLラッパーのUnit Testが実行できる
* PlaywrightによるE2E Testが実装されている
* 主要ユーザーフローのE2E Testが実行できる
* `npm test` でUnit Testが実行できる
* `npm run test:e2e` でPlaywright E2E Testが実行できる
* Unit TestとE2E Testがすべて成功する
