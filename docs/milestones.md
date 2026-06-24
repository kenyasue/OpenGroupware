# マイルストーン・タスク定義書 (Milestones & Tasks)

> 本書は `docs/product-requirements.md`・`docs/functional-design.md`・`docs/architecture.md`・`docs/repository-structure.md`・`docs/development-guidelines.md` に基づき、プロジェクト全体のマイルストーンと各マイルストーンのタスクを詳細に定義する。機能漏れを防ぐため、末尾に「機能カバレッジマトリクス」を設ける。

## マイルストーン全体構成

PRDの開発フェーズ（Phase 1〜5）を依存関係を考慮して15マイルストーンに展開する。

| MS | 名称 | 対応フェーズ | 主な成果物 | 前提 |
|----|------|------------|-----------|------|
| M1 | プロジェクト基盤セットアップ | Phase 1 | Next.js環境・設定ファイル・CI | - |
| M2 | DB基盤（SQLラッパー・Migration） | Phase 1 | sqlite.ts・migrator.ts・初期スキーマ | M1 |
| M3 | 認証・ユーザー管理 | Phase 1 | AuthService・UserRepository・ログイン画面 | M2 |
| M4 | プロジェクト管理・メンバー管理 | Phase 1 | ProjectService・プロジェクト画面・レイアウト | M3 |
| M5 | 通知・アクティビティログ基盤 | Phase 2 | NotificationService・ActivityLogService | M4 |
| M6 | 掲示板 | Phase 2 | BoardService・掲示板画面 | M5 |
| M7 | Markdownメモ | Phase 2 | NoteService・メモエディタ・Markdownプレビュー | M5 |
| M8 | SSE基盤・チャット | Phase 3 | SseHub・ChatService・チャット画面 | M5 |
| M9 | ToDo / Kanban | Phase 3 | TodoService・Kanbanボード | M8 |
| M10 | ファイル共有・Lightbox | Phase 4 | FileStorageService・Lightbox | M4 |
| M11 | カレンダー・マイルストーン | Phase 4 | ScheduleService・カレンダーUI・進捗計算 | M9 |
| M12 | ミーティング管理・スケジュール重複 | Phase 5 | MeetingService・重複判定アルゴリズム | M11 |
| M13 | 検索・ダッシュボード完成 | (横断) | 横断検索・個人/プロジェクトダッシュボード | M6-M12 |
| M14 | バックアップ・管理者機能 | Phase 5 | BackupService・管理者画面 | M2 |
| M15 | 全体テスト完成・品質担保 | (全体) | 全Unit/E2E/統合テスト成功 | M1-M14 |

### マイルストーン進行ルール

- 各マイルストーン完了時に `npm run lint`・`npm run typecheck` が成功すること
- 各マイルストーンで実装したRepository/Service/画面には **Unit Test または E2E Test を必須で実装**する（`docs/development-guidelines.md` テスト実装の必須条件に準拠）
- テスト未実装・未成功のマイルストーンは完了扱いとしない

---

## M1: プロジェクト基盤セットアップ

**目的**: Next.js 15 + TypeScript + Tailwind CSS の開発環境を構築し、全レイヤのディレクトリ構成と品質自動化ツールを整える。

**前提**: なし

### 実装タスク

**基盤・設定**:
- [ ] Next.js 15 プロジェクト初期化（App Router・TypeScript）
- [ ] Tailwind CSS セットアップ（`app/globals.css`・`tailwind.config`）
- [ ] `tsconfig.json` 設定（`@/*` パスエイリアス・strict モード）
- [ ] `next.config.mjs` 設定
- [ ] `.env.example` 作成（`SQLITE_PATH`・uploadsパス等）
- [ ] ディレクトリ構成作成: `app/`・`lib/`・`repositories/`・`services/`・`components/`・`tests/`・`data/`・`backups/`

**品質自動化ツール**:
- [ ] ESLint セットアップ（`eslint.config.js` Flat Config）
- [ ] Prettier セットアップ（`.prettierrc`・`.prettierignore`）
- [ ] Vitest セットアップ（`vitest.config.ts`）
- [ ] Playwright セットアップ（`playwright.config.ts`）
- [ ] Husky + lint-staged セットアップ（pre-commit で Lint・フォーマット・型チェック）
- [ ] CI 設定（`.github/workflows/ci.yml`）: Lint・型チェック・Unit Test・ビルド

**package.json スクリプト**:
- [ ] `lint`・`format`・`typecheck`・`test`・`test:e2e`・`migrate`・`dev`・`build` スクリプト定義

**依存関係**:
- [ ] 本体依存: next・react・react-dom・better-sqlite3・bcrypt・react-markdown・remark-gfm・rehype-sanitize・tailwindcss
- [ ] dev依存: typescript・vitest・@playwright/test・eslint・prettier・husky・lint-staged・tsx

### 完了条件
- [ ] `npm run dev` で開発サーバが起動する
- [ ] `npm run lint`・`npm run typecheck`・`npm run build` が成功する
- [ ] ディレクトリ構成が `repository-structure.md` に準拠している

---

## M2: DB基盤（SQLラッパー・Migration）

**目的**: SQLiteへの共通アクセス基盤とSQLファイルベースのMigration機構を実装する。

**前提**: M1

### 実装タスク

**Data層**:
- [ ] `lib/db/sqlite.ts`: `SqliteDatabase` クラス実装
  - `query<T>` / `get<T>` / `execute` / `transaction<T>` / `close`
  - コンストラクタで `journal_mode=WAL`・`foreign_keys=ON` 設定
  - `getDb()` シングルトン（dbPath = `process.env.SQLITE_PATH ?? "./data/app.db"`）
- [ ] `lib/db/migrator.ts`: `Migrator` クラス実装
  - `schema_migrations` テーブル作成
  - ファイル名順実行・実行済み再実行回避・1ファイル1トランザクション・失敗時ロールバック
- [ ] `lib/db/migrations/001_initial.sql`: 全16テーブル + インデックス作成
  - users・projects・project_members・board_threads・board_comments・chat_messages・todo_columns・todo_items・file_assets・project_notes・milestones・calendar_events・meetings・meeting_members・notifications・activity_logs
  - `idx_project_notes_project_id`・`idx_project_notes_updated_at` インデックス

**型定義**:
- [ ] `lib/types/` に全Entity型定義（User・Project・ProjectMember・BoardThread・BoardComment・ChatMessage・TodoColumn・TodoItem・FileAsset・ProjectNote・Milestone・CalendarEvent・Meeting・MeetingMember・Notification・ActivityLog・SchemaMigration）
  - 列挙型: `UserRole`・`UserStatus`・`ProjectStatus`・`ProjectMemberRole`・`BoardCategory`・`TodoPriority`・`MilestoneStatus`・`CalendarEventType`・`MeetingMemberStatus`・`NotificationType`

**Migration実行・状態確認**:
- [ ] `lib/db/run-migrations.ts`: Migration実行スクリプト（`npm run migrate`）
- [ ] API: `GET /api/admin/migrations`（Migration状態確認・管理者のみ）

### テスト
- [ ] **Unit Test**: `tests/unit/lib/db/sqlite.test.ts`（query/get/execute/transaction・WAL/外部キー設定）
- [ ] **Unit Test**: `tests/unit/lib/db/migrator.test.ts`（ファイル名順実行・再実行回避・失敗時ロールバック）

### 完了条件
- [ ] `npm run migrate` で初期スキーマが作成される
- [ ] Migrationがファイル名順に実行され、実行済みは再実行されない
- [ ] Migration失敗時にロールバックされる
- [ ] Unit Test が成功する

---

## M3: 認証・ユーザー管理

**目的**: 独自ログイン方式による認証とユーザー管理（登録・ログイン・プロフィール・ロール・有効/無効）を実装する。

**前提**: M2

### 実装タスク

**Repository**:
- [ ] `repositories/UserRepository.ts`: `findById`・`findByEmail`・`create`・`update`

**Service**:
- [ ] `services/AuthService.ts`: `register`・`login`・`logout`・`getCurrentUser`・`updateProfile`
- [ ] パスワードハッシュ化（bcrypt・平文保存禁止）
- [ ] ロール管理（system_admin・project_admin・member・guest）
- [ ] アカウント有効/無効（status='inactive' はログイン不可）

**認証ヘルパ**:
- [ ] `lib/auth/session.ts`: セッション読み書き
- [ ] `lib/auth/getCurrentUser.ts`: リクエストから現在ユーザー解決

**バリデータ**:
- [ ] `lib/validators/userValidator.ts`: 必須・メール形式・パスワード強度・名前長

**API**:
- [ ] `POST /api/auth/register`（ユーザー登録）
- [ ] `POST /api/auth/login`（ログイン・Set-Cookie）
- [ ] `POST /api/auth/logout`（ログアウト）
- [ ] `GET /api/auth/me`（現在のユーザー）
- [ ] `PATCH /api/users/me`（プロフィール編集: 表示名・メール・アイコン画像）
- [ ] 全Route Handler に `export const runtime = 'nodejs'` 明示
- [ ] 認証ミドルウェア: 未ログイン時は保護画面をログイン画面へリダイレクト（401）

**画面**:
- [ ] `app/login/page.tsx`（ログイン画面）
- [ ] `app/profile/page.tsx`（ユーザープロフィール・アイコン画像設定・表示名設定）
- [ ] `app/layout.tsx`（ルートレイアウト）

### テスト
- [ ] **Unit Test**: `tests/unit/repositories/UserRepository.test.ts`（CRUD・email一意・論理的確認）
- [ ] **Unit Test**: `tests/unit/services/AuthService.test.ts`（登録・ログイン・ログアウト・プロフィール更新・無効アカウント拒否）
- [ ] **E2E Test**: `tests/e2e/auth.spec.ts`（ログイン・ログアウト・未ログインの保護画面アクセス拒否）

### 完了条件
- [ ] ユーザー登録・ログイン・ログアウトができる
- [ ] パスワードがハッシュ化保存される
- [ ] プロフィール・アイコン画像が編集できる
- [ ] 無効アカウントはログイン不可
- [ ] 未ログインで保護画面にアクセスできない
- [ ] Unit Test・E2E Test が成功する

---

## M4: プロジェクト管理・メンバー管理

**目的**: プロジェクトの作成・編集・削除・アーカイブと、メンバー追加・削除・ロール設定を実装する。プロジェクトダッシュボードの骨組みも作る。

**前提**: M3

### 実装タスク

**Repository**:
- [ ] `repositories/ProjectRepository.ts`: `findById`・`findByOwner`・`create`・`update`・`delete`
- [ ] `repositories/ProjectMemberRepository.ts`: `findByProject`・`findByUser`・`add`・`remove`・`isMember`・`getRole`

**Service**:
- [ ] `services/ProjectService.ts`: `createProject`・`updateProject`・`addMember`・`removeMember`・`archiveProject`・`getDashboard`
- [ ] 権限チェック: `isMember`・`getRole`（非参加者は403・プロジェクト管理者権限チェック）
- [ ] プロジェクトステータス管理（active・on_hold・completed・archived）
- [ ] メンバー追加時に通知（M5のNotificationService連携）

**バリデータ**:
- [ ] `lib/validators/projectValidator.ts`: プロジェクト名1-200文字・説明文

**API**:
- [ ] `GET /api/projects`（自分の参加プロジェクト一覧）
- [ ] `POST /api/projects`（プロジェクト作成）
- [ ] `GET /api/projects/:projectId`（プロジェクト詳細/ダッシュボード）
- [ ] `PATCH /api/projects/:projectId`（プロジェクト編集: 名前・説明・ステータス）
- [ ] `DELETE /api/projects/:projectId`（プロジェクト削除）
- [ ] `GET /api/projects/:projectId/members`（メンバー一覧）
- [ ] `POST /api/projects/:projectId/members`（メンバー追加）
- [ ] `DELETE /api/projects/:projectId/members/:userId`（メンバー削除）

**画面・コンポーネント**:
- [ ] `app/dashboard/page.tsx`（個人ダッシュボード骨組み: 参加プロジェクト一覧）
- [ ] `app/projects/[projectId]/page.tsx`（プロジェクト概要/ダッシュボード骨組み）
- [ ] `app/projects/[projectId]/members/page.tsx`（メンバー管理）
- [ ] `app/projects/[projectId]/settings/page.tsx`（プロジェクト設定）
- [ ] `components/layout/`（Header・Sidebar・ProjectNav）
- [ ] `components/project/`（ProjectCard・DashboardWidget）

### テスト
- [ ] **Unit Test**: `tests/unit/repositories/ProjectRepository.test.ts`
- [ ] **Unit Test**: `tests/unit/repositories/ProjectMemberRepository.test.ts`（CRUD・UNIQUE制約・isMember・getRole）
- [ ] **Unit Test**: `tests/unit/services/ProjectService.test.ts`（作成・編集・アーカイブ・メンバー追加/削除・権限チェック・プロジェクト分離）
- [ ] **Integration Test**: `tests/integration/project-member-permission.test.ts`（非参加者はプロジェクトデータにアクセス不可）
- [ ] **E2E Test**: `tests/e2e/project-management.spec.ts`（作成・編集・メンバー追加/削除・アーカイブ）

### 完了条件
- [ ] プロジェクト作成・編集・削除・アーカイブができる
- [ ] メンバー追加・削除・ロール設定ができる
- [ ] 非参加者はプロジェクト情報にアクセスできない（403）
- [ ] Unit・Integration・E2E Test が成功する

---

## M5: 通知・アクティビティログ基盤

**目的**: 通知生成とアクティビティログ記録の基盤Serviceを実装し、後続機能（掲示板・チャット・ToDo等）から利用可能にする。

**前提**: M4

### 実装タスク

**Repository**:
- [ ] `repositories/NotificationRepository.ts`: 通知作成・未読一覧（ページネーション）・既読化
- [ ] `repositories/ActivityLogRepository.ts`: ログ作成・プロジェクト別一覧（ページネーション）

**Service**:
- [ ] `services/NotificationService.ts`: `notifyOnEvent`・`resolveTargets`
  - 対象イベント: mention・todo_assigned・todo_due_soon・meeting_invited・board_commented・project_added・file_shared・note_updated
  - 対象ユーザー解決ロジック（メンション先・担当者・ミーティング参加者・掲示板投稿者・プロジェクトメンバー等）
- [ ] `services/ActivityLogService.ts`: `logActivity`
  - 記録対象: todo_created・todo_updated・todo_completed・file_uploaded・board_posted・comment_added・note_created・note_updated・meeting_created・member_added・milestone_updated
- [ ] 管理者操作もアクティビティログに記録

**API**:
- [ ] `GET /api/notifications`（未読通知一覧）
- [ ] `POST /api/notifications/:id/read`（既読化）
- [ ] `GET /api/projects/:projectId/activity`（アクティビティログ一覧）

**画面・コンポーネント**:
- [ ] `app/notifications/page.tsx`（通知一覧画面）※共通画面
- [ ] `components/notifications/NotificationList.tsx`・`NotificationBadge.tsx`（ヘッダの未読バッジ）
- [ ] `app/projects/[projectId]/activity/page.tsx`（プロジェクト別アクティビティログ画面）

### テスト
- [ ] **Unit Test**: `tests/unit/repositories/NotificationRepository.test.ts`
- [ ] **Unit Test**: `tests/unit/repositories/ActivityLogRepository.test.ts`
- [ ] **Unit Test**: `tests/unit/services/NotificationService.test.ts`（正しいユーザーへ通知作成・resolveTargets）
- [ ] **Unit Test**: `tests/unit/services/ActivityLogService.test.ts`（ログ記録・プロジェクト分離）

### 完了条件
- [ ] 各イベント種別で通知が正しいユーザーに作成される
- [ ] 変更操作がアクティビティログに記録される
- [ ] 通知の既読化ができる
- [ ] Unit Test が成功する

---

## M6: 掲示板

**目的**: プロジェクト単位の非リアルタイム情報共有（スレッド・コメント・カテゴリ・ピン留め・重要マーク・既読・検索）を実装する。

**前提**: M5

### 実装タスク

**Repository**:
- [ ] `repositories/BoardRepository.ts`: スレッドCRUD・コメントCRUD・検索・ページネーション（`deleted_at IS NULL` 必須）

**Service**:
- [ ] `services/BoardService.ts`: スレッド作成/編集/削除・コメント作成/編集/削除
- [ ] 権限チェック（プロジェクト参加者のみ）
- [ ] カテゴリ分類（notice・spec・minutes・question・decision・trouble・memo）
- [ ] ピン留め・重要マーク
- [ ] 既読管理
- [ ] コメント追加時に通知（`board_commented` → 投稿者）・アクティビティログ記録（`board_posted`・`comment_added`）

**API**:
- [ ] `GET /api/projects/:projectId/board/threads`（一覧・ページネーション・検索）
- [ ] `POST /api/projects/:projectId/board/threads`（作成）
- [ ] `GET /api/projects/:projectId/board/threads/:threadId`（詳細）
- [ ] `PATCH /api/projects/:projectId/board/threads/:threadId`（編集）
- [ ] `DELETE /api/projects/:projectId/board/threads/:threadId`（削除）
- [ ] `POST /api/projects/:projectId/board/threads/:threadId/comments`（コメント作成）
- [ ] `PATCH /api/projects/:projectId/board/comments/:commentId`（コメント編集）
- [ ] `DELETE /api/projects/:projectId/board/comments/:commentId`（コメント削除）

**画面・コンポーネント**:
- [ ] `app/projects/[projectId]/board/page.tsx`（掲示板一覧）
- [ ] スレッド詳細・作成/編集フォーム
- [ ] `components/board/`（ThreadList・ThreadForm・CommentList）
- [ ] Markdown本文表示（react-markdown + rehype-sanitize）

### テスト
- [ ] **Unit Test**: `tests/unit/repositories/BoardRepository.test.ts`（CRUD・論理削除非取得・プロジェクト分離・検索）
- [ ] **Unit Test**: `tests/unit/services/BoardService.test.ts`（権限チェック・カテゴリ・ピン留め・通知・アクティビティログ）
- [ ] **E2E Test**: `tests/e2e/board.spec.ts`（スレッド作成・編集・コメント・検索）

### 完了条件
- [ ] スレッド・コメントのCRUDができる
- [ ] カテゴリ・ピン留め・重要マーク・既読・検索ができる
- [ ] 論理削除済みデータが通常取得に含まれない
- [ ] Unit・E2E Test が成功する

---

## M7: Markdownメモ

**目的**: プロジェクトごとのMarkdownメモ（作成・編集・プレビュー・タグ・ピン留め・検索・添付・関連付け）を実装する。

**前提**: M5

### 実装タスク

**Repository**:
- [ ] `repositories/ProjectNoteRepository.ts`: メモCRUD・検索・ピン留め（`deleted_at IS NULL`・インデックス活用）

**Service**:
- [ ] `services/NoteService.ts`: メモ作成/編集/削除
- [ ] 権限チェック
- [ ] タイトル・タグ・ピン留め
- [ ] 作成者・最終更新者・更新日時管理
- [ ] ファイル添付・関連ToDo・関連ミーティング設定
- [ ] 更新時に通知（`note_updated`）・アクティビティログ（`note_created`・`note_updated`）

**Markdownレンダリング（セキュリティ）**:
- [ ] react-markdown + remark-gfm + rehype-sanitize でプレビュー
- [ ] HTML直接入力無効化・危険URLスキーム（`javascript:`等）除外
- [ ] 対応記法: 見出し・箇条書き・番号リスト・チェックリスト・コードブロック・テーブル・リンク・画像・引用

**API**:
- [ ] `GET /api/projects/:projectId/notes`（一覧・検索・ページネーション）
- [ ] `POST /api/projects/:projectId/notes`（作成）
- [ ] `GET /api/projects/:projectId/notes/:noteId`（詳細）
- [ ] `PATCH /api/projects/:projectId/notes/:noteId`（編集）
- [ ] `DELETE /api/projects/:projectId/notes/:noteId`（削除）

**画面・コンポーネント**:
- [ ] `app/projects/[projectId]/notes/page.tsx`（メモ一覧）
- [ ] メモエディタ・プレビュー画面
- [ ] `components/notes/`（NoteEditor・MarkdownPreview）

### テスト
- [ ] **Unit Test**: `tests/unit/repositories/ProjectNoteRepository.test.ts`（CRUD・検索・ピン留め・論理削除・プロジェクト分離）
- [ ] **Unit Test**: `tests/unit/services/NoteService.test.ts`（権限・タグ・ピン留め・関連付け・通知・アクティビティログ）
- [ ] **E2E Test**: `tests/e2e/markdown-notes.spec.ts`（作成・編集・プレビュー・ピン留め・検索・削除）

### 完了条件
- [ ] MarkdownメモのCRUD・プレビューができる
- [ ] タグ・ピン留め・検索ができる
- [ ] MarkdownがサニタイズされHTML直接入力が無効化される
- [ ] Unit・E2E Test が成功する

---

## M8: SSE基盤・チャット

**目的**: SSE配信基盤（SseHub）とプロジェクト別リアルタイムチャット（送信・編集・削除・メンション・リアクション・既読/未読・検索）を実装する。

**前提**: M5

### 実装タスク

**SSE基盤**:
- [ ] `lib/sse/hub.ts`: `SseHub` クラス（`addClient`・`removeClient`・`broadcast`）
  - プロジェクト単位のクライアント集合管理
  - 当該プロジェクトのみ配信（他プロジェクトへ漏れさせない）
- [ ] SSEエンドポイント: `GET /api/projects/:projectId/chat/stream`
- [ ] クライアント側の自動再接続対応
- [ ] SSEイベント種別: `chat.message.created`・`chat.message.updated`・`chat.message.deleted`・`todo.updated`・`file.uploaded`・`meeting.created`・`note.updated`・`notification.created`

**Repository**:
- [ ] `repositories/ChatRepository.ts`: メッセージCRUD・ページネーション・検索（`deleted_at IS NULL`）

**Service**:
- [ ] `services/ChatService.ts`: `sendMessage`・`editMessage`・`deleteMessage`・`getHistory`
- [ ] 権限チェック（プロジェクト参加者のみ）
- [ ] メンション検出 → 通知（`mention`）
- [ ] SSE配信（`chat.message.created/updated/deleted`）
- [ ] リアクション・既読/未読・添付ファイル

**API**:
- [ ] `GET /api/projects/:projectId/chat/messages`（履歴・ページネーション・検索）
- [ ] `POST /api/projects/:projectId/chat/messages`（送信）
- [ ] `PATCH /api/projects/:projectId/chat/messages/:messageId`（編集）
- [ ] `DELETE /api/projects/:projectId/chat/messages/:messageId`（削除）

**画面・コンポーネント**:
- [ ] `app/projects/[projectId]/chat/page.tsx`（チャット画面）
- [ ] `components/chat/`（ChatWindow・MessageInput・MessageList）

### テスト
- [ ] **Unit Test**: `tests/unit/lib/sse/hub.test.ts`（クライアント管理・プロジェクト別配信・配信スコープ）
- [ ] **Unit Test**: `tests/unit/repositories/ChatRepository.test.ts`（CRUD・検索・論理削除・プロジェクト分離）
- [ ] **Unit Test**: `tests/unit/services/ChatService.test.ts`（送信・編集・削除・メンション通知・SSE配信呼出・権限）
- [ ] **Integration Test**: `tests/integration/chat-sse-broadcast.test.ts`（送信→SSE配信）
- [ ] **E2E Test**: `tests/e2e/chat-sse.spec.ts`（送信・別コンテキストでSSEリアルタイム受信・編集・削除）

### 完了条件
- [ ] メッセージ送信・編集・削除ができる
- [ ] SSEで別クライアントにリアルタイム配信される
- [ ] 接続切断時に自動再接続される
- [ ] メンション・リアクション・既読/未読・検索ができる
- [ ] Unit・Integration・E2E Test が成功する

---

## M9: ToDo / Kanban

**目的**: プロジェクトごとのタスクをKanban形式で管理する（カラム・タスク・ドラッグ&ドロップ・担当者・期限・優先度・ラベル・チェックリスト・完了・マイルストーン紐づけ・カレンダー表示）。

**前提**: M8

### 実装タスク

**Repository**:
- [ ] `repositories/TodoRepository.ts`: カラムCRUD・タスクCRUD・並び替え（orderIndex再計算）・ページネーション（`deleted_at IS NULL`）

**Service**:
- [ ] `services/TodoService.ts`: カラム作成/編集/削除/並び替え・タスク作成/編集/削除/移動
- [ ] 権限チェック
- [ ] 担当者・期限・優先度（low/normal/high）・ラベル設定
- [ ] チェックリスト・コメント・添付ファイル
- [ ] 完了状態管理（`completedAt`）
- [ ] マイルストーン紐づけ
- [ ] 担当者割り当て時に通知（`todo_assigned`）・アクティビティログ（`todo_created`・`todo_updated`・`todo_completed`）
- [ ] SSE配信（`todo.updated`）
- [ ] 標準カラム初期生成: Backlog・To Do・In Progress・Review・Done

**API**:
- [ ] `GET /api/projects/:projectId/todos/columns`（カラム一覧）
- [ ] `POST /api/projects/:projectId/todos/columns`（カラム作成）
- [ ] `PATCH /api/projects/:projectId/todos/columns/:columnId`（カラム編集/並び替え）
- [ ] `DELETE /api/projects/:projectId/todos/columns/:columnId`（カラム削除）
- [ ] `GET /api/projects/:projectId/todos/items`（タスク一覧）
- [ ] `POST /api/projects/:projectId/todos/items`（タスク作成）
- [ ] `PATCH /api/projects/:projectId/todos/items/:itemId`（タスク編集/移動）
- [ ] `DELETE /api/projects/:projectId/todos/items/:itemId`（タスク削除）

**画面・コンポーネント**:
- [ ] `app/projects/[projectId]/todos/page.tsx`（Kanbanボード）
- [ ] `components/todo/`（KanbanBoard・KanbanColumn・TodoCard）ドラッグ&ドロップ対応

### テスト
- [ ] **Unit Test**: `tests/unit/repositories/TodoRepository.test.ts`（CRUD・並び替え・論理削除・プロジェクト分離）
- [ ] **Unit Test**: `tests/unit/services/TodoService.test.ts`（作成・編集・移動・完了・担当者通知・アクティビティログ・権限）
- [ ] **E2E Test**: `tests/e2e/todo-kanban.spec.ts`（カラム作成・タスク作成・編集・別カラム移動・担当者/期限設定・完了）

### 完了条件
- [ ] Kanbanボードが表示される（標準カラム5つ）
- [ ] カラム・タスクのCRUD・ドラッグ&ドロップ移動ができる
- [ ] 担当者・期限・優先度・ラベル・チェックリスト・コメントが設定できる
- [ ] 完了タスクがDoneカラムに表示される
- [ ] Unit・E2E Test が成功する

---

## M10: ファイル共有・Lightbox

**目的**: プロジェクト内ファイルのアップロード・一覧・フォルダ管理・Lightbox閲覧・PDFプレビュー・紐づけを実装する。

**前提**: M4

### 実装タスク

**Repository**:
- [ ] `repositories/FileRepository.ts`: ファイルメタCRUD・フォルダ管理（`deleted_at IS NULL`）

**Service**:
- [ ] `services/FileStorageService.ts`: `upload`・`getDownloadStream`・`delete`
  - ローカルFS保存: `data/uploads/<projectId>/<uuid>.<ext>`
  - MIMEタイプチェック・ファイル名サニタイズ・保存名一意化
  - ファイルアクセス権限チェック（プロジェクト参加者のみ）
  - アクティビティログ（`file_uploaded`）・通知（`file_shared`）・SSE配信（`file.uploaded`）

**ファイル紐づけ**:
- [ ] ファイルとToDo・掲示板投稿・ミーティング・Markdownメモの紐づけ
- [ ] ファイルコメント

**API**:
- [ ] `GET /api/projects/:projectId/files`（一覧・ページネーション）
- [ ] `POST /api/projects/:projectId/files`（アップロード・multipart）
- [ ] `GET /api/files/:fileId/download`（ダウンロード・権限チェック）
- [ ] `DELETE /api/files/:fileId`（削除）

**画面・コンポーネント**:
- [ ] `app/projects/[projectId]/files/page.tsx`（ファイル一覧）
- [ ] `components/files/`（FileList・Uploader・Lightbox）
  - 画像Lightbox表示・PDFプレビュー

### テスト
- [ ] **Unit Test**: `tests/unit/repositories/FileRepository.test.ts`
- [ ] **Unit Test**: `tests/unit/services/FileStorageService.test.ts`（アップロード・MIMEチェック・保存名一意化・権限・削除・アクティビティログ）
- [ ] **E2E Test**: `tests/e2e/file-sharing.spec.ts`（アップロード・一覧・Lightbox閲覧・PDFプレビュー・削除）

### 完了条件
- [ ] ファイルアップロード・一覧・ダウンロード・削除ができる
- [ ] 画像をLightboxで閲覧できる・PDFをプレビューできる
- [ ] MIMEチェック・権限チェックが機能する
- [ ] ファイル紐づけ・コメントができる
- [ ] Unit・E2E Test が成功する

---

## M11: カレンダー・マイルストーン

**目的**: カレンダー（月/週/日/リスト表示・各種イベント表示・フィルター）とマイルストーン管理（CRUD・進捗率自動計算）を実装する。

**前提**: M9

### 実装タスク

**Repository**:
- [ ] `repositories/CalendarRepository.ts`: イベントCRUD・期間検索（`deleted_at IS NULL`）
- [ ] `repositories/MilestoneRepository.ts`: マイルストーンCRUD・関連ToDo取得（`deleted_at IS NULL`）

**Service**:
- [ ] `services/ScheduleService.ts`: `getCalendarEvents`（期間・フィルター）
  - 表示対象: マイルストーン・デッドライン・ToDo開始日・ToDo期限・ミーティング・任意イベント
  - メンバー別フィルター・種別フィルター
- [ ] マイルストーン管理Service: 作成/編集/削除・期限・説明文・関連ToDo紐づけ
- [ ] **進捗率自動計算アルゴリズム**: 関連ToDoの完了率から0-100を算出
- [ ] 完了状態管理・カレンダー表示
- [ ] アクティビティログ（`milestone_updated`）

**API**:
- [ ] `GET /api/projects/:projectId/calendar/events`（イベント一覧・期間・フィルタ）
- [ ] `POST /api/projects/:projectId/calendar/events`（イベント作成）
- [ ] `PATCH /api/projects/:projectId/calendar/events/:eventId`（編集）
- [ ] `DELETE /api/projects/:projectId/calendar/events/:eventId`（削除）
- [ ] `GET /api/projects/:projectId/milestones`（マイルストーン一覧）
- [ ] `POST /api/projects/:projectId/milestones`（作成）
- [ ] `PATCH /api/projects/:projectId/milestones/:id`（編集）
- [ ] `GET /api/projects/:projectId/milestones/:id/progress`（進捗率取得）

**画面・コンポーネント**:
- [ ] `app/projects/[projectId]/calendar/page.tsx`（カレンダー: 月/週/日/リスト表示）
- [ ] `app/projects/[projectId]/milestones/page.tsx`（マイルストーン一覧・進捗バー）
- [ ] `components/calendar/`（CalendarView・EventBadge）

### テスト
- [ ] **Unit Test**: `tests/unit/repositories/CalendarRepository.test.ts`
- [ ] **Unit Test**: `tests/unit/repositories/MilestoneRepository.test.ts`
- [ ] **Unit Test**: `tests/unit/services/ScheduleService.test.ts`（期間検索・フィルタ・種別別取得）
- [ ] **Unit Test**: 進捗率計算アルゴリズム（`calcMilestoneProgress`・ToDo0件時0%・完了率計算）
- [ ] **E2E Test**: `tests/e2e/calendar.spec.ts`（ToDo期限・マイルストーン・ミーティング表示・イベント作成/編集）

### 完了条件
- [ ] 月/週/日/リスト表示ができる
- [ ] マイルストーン・デッドライン・ToDo期限・ミーティングが表示される
- [ ] イベントCRUD・フィルターができる
- [ ] マイルストーン進捗率が自動計算される
- [ ] Unit・E2E Test が成功する

---

## M12: ミーティング管理・スケジュール重複チェック

**目的**: ミーティングCRUD・参加メンバー設定・アジェンダ/議事録・関連付け・スケジュール重複判定を実装する。

**前提**: M11

### 実装タスク

**Repository**:
- [ ] `repositories/MeetingRepository.ts`: ミーティングCRUD・meeting_members管理（`deleted_at IS NULL`）

**Service**:
- [ ] `services/MeetingService.ts`: `createMeeting`・`updateMeeting`・`deleteMeeting`・`checkScheduleConflicts`・`updateMinutes`
- [ ] 権限チェック
- [ ] タイトル・説明・開始/終了日時・参加メンバー・場所・ミーティングURL設定
- [ ] アジェンダ・議事録（Markdown）
- [ ] 関連ToDo・関連ファイル・関連掲示板投稿・関連Markdownメモ設定
- [ ] カレンダー表示連携
- [ ] 参加者招待通知（`meeting_invited`）・アクティビティログ（`meeting_created`）・SSE配信（`meeting.created`）

**スケジュール重複判定アルゴリズム**:
- [ ] `checkScheduleConflicts`: 選択メンバーの予定重複を検出
  - 判定対象1: 他のミーティング（meeting_members経由・時間重複）
  - 判定対象2: カレンダーイベント（時間重複）
  - 判定対象3: 期限の近い重要タスク（priority='high'・dueDate ±3日以内）
  - 時間重複判定: `NOT (existing.end <= new.start OR existing.start >= new.end)`
  - 重複があれば警告返却（作成自体はブロックしない）

**API**:
- [ ] `GET /api/projects/:projectId/meetings`（一覧）
- [ ] `POST /api/projects/:projectId/meetings`（作成・conflicts返却）
- [ ] `PATCH /api/projects/:projectId/meetings/:id`（編集）
- [ ] `POST /api/projects/:projectId/meetings/check`（予定重複チェックのみ）

**画面・コンポーネント**:
- [ ] `app/projects/[projectId]/meetings/page.tsx`（ミーティング一覧）
- [ ] ミーティング作成フォーム・アジェンダ/議事録編集
- [ ] `components/meetings/`（MeetingForm・ConflictWarning）

### テスト
- [ ] **Unit Test**: `tests/unit/repositories/MeetingRepository.test.ts`（CRUD・meeting_members・UNIQUE制約・論理削除・プロジェクト分離）
- [ ] **Unit Test**: `tests/unit/services/MeetingService.test.ts`（作成・編集・議事録更新・参加者通知・アクティビティログ・権限）
- [ ] **Unit Test**: スケジュール重複判定アルゴリズム（他ミーティング重複・カレンダーイベント重複・重要タスク検出・時間重複ロジック・excludeMeetingId）
- [ ] **E2E Test**: `tests/e2e/meetings.spec.ts`（作成・参加メンバー設定・予定重複警告・アジェンダ/議事録・関連付け）

### 完了条件
- [ ] ミーティングCRUD・参加メンバー設定ができる
- [ ] アジェンダ・議事録が入力できる
- [ ] 関連付け（ToDo/ファイル/掲示板/メモ）ができる
- [ ] 参加メンバーの予定重複が画面上で警告される
- [ ] Unit・E2E Test が成功する

---

## M13: 検索・ダッシュボード完成

**目的**: プロジェクト内横断検索と、個人/プロジェクトダッシュボードの全項目表示を完成させる。

**前提**: M6-M12（各データソース完成後）

### 実装タスク

**横断検索**:
- [ ] 検索対象: 掲示板・チャット・ToDo・ファイル名・カレンダーイベント・ミーティング・議事録・マイルストーン・Markdownメモ
- [ ] 検索条件: キーワード・投稿者・担当者・日付・種別・プロジェクト・タグ
- [ ] API: `GET /api/projects/:projectId/search`
- [ ] 画面: 検索結果一覧

**個人ダッシュボード完成**:
- [ ] 自分の参加プロジェクト
- [ ] 自分の未完了ToDo
- [ ] 今日の予定
- [ ] 近日中のミーティング
- [ ] 未読通知
- [ ] 期限切れタスク
- [ ] 最近のアクティビティ
- [ ] `app/dashboard/page.tsx` 完成版

**プロジェクトダッシュボード完成**:
- [ ] プロジェクト概要
- [ ] 進行中ToDo
- [ ] 期限が近いToDo（7日以内）
- [ ] 最新チャット（直近5件）
- [ ] 最新掲示板（ピン留め優先・直近5件）
- [ ] 最新Markdownメモ（ピン留め優先・直近5件）
- [ ] 最近のファイル（直近5件）
- [ ] 次回ミーティング（直近1件）
- [ ] マイルストーン進捗（進捗バー付き）
- [ ] 最近のアクティビティ（直近10件）
- [ ] `app/projects/[projectId]/page.tsx` 完成版

### テスト
- [ ] **Unit Test**: 検索ロジック（各リソース横断検索・フィルタ絞り込み）
- [ ] **Unit Test**: ダッシュボード集計ロジック（未完了ToDo・期限近いToDo・今日の予定等）
- [ ] **E2E Test**: ダッシュボード表示確認（個人・プロジェクト各項目の表示）

### 完了条件
- [ ] 横断検索で全リソースが検索できる
- [ ] 検索フィルターが機能する
- [ ] 個人ダッシュボードの全項目が表示される
- [ ] プロジェクトダッシュボードの全項目が表示される
- [ ] Unit・E2E Test が成功する

---

## M14: バックアップ・管理者機能

**目的**: 管理者によるバックアップ作成（DB+uploads ZIP化）・一覧・ダウンロードとMigration状態確認画面を実装する。

**前提**: M2

### 実装タスク

**Service**:
- [ ] `services/BackupService.ts`: `createBackup`・`listBackups`・`downloadBackup`
  - SQLite DBファイル + uploadsディレクトリをZIP化
  - 保存先: `backups/backup-<timestamp>.zip`
  - 管理者権限チェック（`role='system_admin'` のみ）
  - 管理者操作をアクティビティログに記録

**API**:
- [ ] `GET /api/admin/backups`（バックアップ一覧・管理者のみ）
- [ ] `POST /api/admin/backups`（バックアップ作成・管理者のみ）
- [ ] `GET /api/admin/backups/:filename`（ダウンロード・管理者のみ）
- [ ] `GET /api/admin/migrations`（Migration状態確認・管理者のみ）※M2でAPI実装済なら画面連携

**画面**:
- [ ] `app/admin/backups/page.tsx`（管理者バックアップ画面: 作成・一覧・ダウンロード）
- [ ] Migration状態確認画面（管理者）

### テスト
- [ ] **Unit Test**: `tests/unit/services/BackupService.test.ts`（バックアップ作成・ZIP化・一覧・ダウンロード・権限チェック）
- [ ] **E2E Test**: `tests/e2e/backup.spec.ts`（作成・一覧表示・ダウンロード）

### 完了条件
- [ ] 管理者がバックアップを作成できる
- [ ] バックアップ一覧が表示される
- [ ] バックアップファイルをダウンロードできる
- [ ] 非管理者はアクセスできない（403）
- [ ] Migration状態が確認できる
- [ ] Unit・E2E Test が成功する

---

## M15: 全体テスト完成・品質担保

**目的**: 全マイルストールのテストを統合し、カバレッジ目標と成功条件/受け入れ要件を全項目クリアする。

**前提**: M1-M14

### 実装タスク

**Unit Test 完成**:
- [ ] SQLラッパー・Migration・全13Repository・全12Service のUnit Test 完成
- [ ] 権限チェック・バリデーション・スケジュール重複判定・通知作成ロジック・アクティビティログ作成ロジック・マイルストーン進捗計算 のUnit Test 完成
- [ ] Repository/Service層カバレッジ 80%以上
- [ ] `npm test` 全件成功

**統合テスト完成**:
- [ ] `tests/integration/auth-flow.test.ts`（登録→ログイン→保護画面アクセス）
- [ ] `tests/integration/project-member-permission.test.ts`（プロジェクト作成→メンバー追加→権限分離）
- [ ] `tests/integration/chat-sse-broadcast.test.ts`（チャット送信→SSE配信）

**E2E Test 完成**:
- [ ] 全12シナリオ完成: auth・project-management・board・chat-sse・todo-kanban・file-sharing・markdown-notes・calendar・meetings・notifications・activity-log・backup
- [ ] 主要フローカバレッジ 100%
- [ ] `npm run test:e2e` 全件成功

**品質ゲート**:
- [ ] `npm run lint` エラーなし
- [ ] `npm run typecheck` 成功
- [ ] `npm run build` 成功

**受け入れ要件確認**:
- [ ] PRD「成功条件/受け入れ要件」の全項目を確認（ユーザーログイン〜バックアップ作成・Unit Test・E2E Test 全成功まで）

### 完了条件
- [ ] `npm test` でUnit Testが全件成功する
- [ ] `npm run test:e2e` でPlaywright E2E Testが全件成功する
- [ ] 統合テストが全件成功する
- [ ] Lint・型チェック・ビルドが成功する
- [ ] PRDの受け入れ要件を全項目クリアする

---

## 機能カバレッジマトリクス

PRDの機能要件（16機能）＋DB基盤＋テストがどのマイルストーンで実装されるかを示す。機能漏れがないことを保証する。

| 機能 | PRD優先度 | 実装MS | 完了確認MS | 備考 |
|------|----------|--------|-----------|------|
| DB基盤（SQLラッパー・Migration・Repository基盤） | P0 | M2 | M2 | 全16テーブル+schema_migrations |
| ユーザー管理（登録・ログイン・プロフィール・ロール・有効/無効） | P0 | M3 | M3 | bcrypt・独自ログイン |
| プロジェクト管理（作成・編集・削除・アーカイブ・ステータス） | P0 | M4 | M4 | |
| プロジェクトメンバー管理（追加・削除・ロール） | P0 | M4 | M4 | |
| 通知（アプリ内・未読一覧・既読化・8イベント） | P0 | M5 | M5 | 基盤Service・各機能から連携 |
| アクティビティログ（11操作記録・時系列表示） | P1 | M5 | M5 | 基盤Service・各機能から連携 |
| 掲示板（スレッド・コメント・カテゴリ・ピン留め・重要・既読・検索） | P0 | M6 | M6 | |
| Markdownメモ（CRUD・プレビュー・タグ・ピン留め・検索・添付・関連付け） | P0 | M7 | M7 | サニタイズ必須 |
| SSE基盤（SseHub・プロジェクト別配信・自動再接続・8イベント） | P0 | M8 | M8 | |
| チャット（送信・編集・削除・メンション・リアクション・既読/未読・検索） | P0 | M8 | M8 | SSEリアルタイム |
| ToDo / Kanban（カラム・タスク・D&D・担当・期限・優先度・ラベル・チェックリスト・完了・マイルストーン紐づけ） | P0 | M9 | M9 | |
| ファイル共有（アップロード・一覧・フォルダ・Lightbox・PDF・コメント・紐づけ・MIMEチェック） | P0 | M10 | M10 | ローカルFS保存 |
| カレンダー（月/週/日/リスト・イベントCRUD・フィルタ） | P0 | M11 | M11 | |
| マイルストーン管理（CRUD・期限・関連ToDo・進捗率自動計算・完了） | P1 | M11 | M11 | |
| ミーティング管理（CRUD・メンバー・アジェンダ/議事録・関連付け・カレンダー連携） | P0 | M12 | M12 | |
| スケジュール重複チェック（他ミーティング・カレンダーイベント・重要タスク） | P0 | M12 | M12 | 警告表示（ブロックしない） |
| 検索（横断検索・7フィルタ条件） | P1 | M13 | M13 | 9リソース横断 |
| 個人ダッシュボード（7項目） | P0 | M4(骨組み) | M13 | 全項目完成はM13 |
| プロジェクトダッシュボード（9項目） | P0 | M4(骨組み) | M13 | 全項目完成はM13 |
| バックアップ（DB+uploads ZIP・一覧・ダウンロード・Migration状態確認） | P1 | M14 | M14 | 管理者のみ |

### Repository カバレッジ（13クラス）

| Repository | 実装MS | Unit Test MS |
|-----------|--------|-------------|
| UserRepository | M3 | M3 |
| ProjectRepository | M4 | M4 |
| ProjectMemberRepository | M4 | M4 |
| NotificationRepository | M5 | M5 |
| ActivityLogRepository | M5 | M5 |
| BoardRepository | M6 | M6 |
| ProjectNoteRepository | M7 | M7 |
| ChatRepository | M8 | M8 |
| TodoRepository | M9 | M9 |
| FileRepository | M10 | M10 |
| CalendarRepository | M11 | M11 |
| MilestoneRepository | M11 | M11 |
| MeetingRepository | M12 | M12 |

### Service カバレッジ（12クラス）

| Service | 実装MS | Unit Test MS |
|---------|--------|-------------|
| AuthService | M3 | M3 |
| ProjectService | M4 | M4 |
| NotificationService | M5 | M5 |
| ActivityLogService | M5 | M5 |
| BoardService | M6 | M6 |
| NoteService | M7 | M7 |
| ChatService | M8 | M8 |
| TodoService | M9 | M9 |
| FileStorageService | M10 | M10 |
| ScheduleService | M11 | M11 |
| (マイルストーン進捗計算) | M11 | M11 |
| MeetingService | M12 | M12 |
| (スケジュール重複判定) | M12 | M12 |
| BackupService | M14 | M14 |

### E2E Test カバレッジ（12シナリオ）

| E2Eシナリオ | 実装MS |
|------------|--------|
| auth.spec.ts | M3 |
| project-management.spec.ts | M4 |
| board.spec.ts | M6 |
| markdown-notes.spec.ts | M7 |
| chat-sse.spec.ts | M8 |
| todo-kanban.spec.ts | M9 |
| file-sharing.spec.ts | M10 |
| calendar.spec.ts | M11 |
| meetings.spec.ts | M12 |
| notifications.spec.ts | M5（通知一覧）/ 各MS（イベント発生時） |
| activity-log.spec.ts | M5（一覧）/ 各MS（記録時） |
| backup.spec.ts | M14 |

### 統合テスト カバレッジ（3シナリオ）

| 統合テスト | 実装MS |
|----------|--------|
| auth-flow.test.ts | M3 |
| project-member-permission.test.ts | M4 |
| chat-sse-broadcast.test.ts | M8 |

---

## フェーズ対応表

PRDの開発順序（Phase 1〜5）とマイルストーンの対応。

| フェーズ | 内容 | 対象マイルストーン |
|---------|------|------------------|
| Phase 1: 基盤 | Next.js・Tailwind・SQLite・SQLラッパー・Migration・Repository基盤・認証・ユーザー管理・プロジェクト管理・メンバー管理 | M1・M2・M3・M4 |
| Phase 2: プロジェクト内基本機能 | 通知・アクティビティログ・プロジェクトダッシュボード(骨組み)・掲示板・Markdownメモ | M5・M6・M7 |
| Phase 3: リアルタイム・タスク管理 | SSE基盤・チャット・メンション・既読/未読・ToDo/Kanban | M8・M9 |
| Phase 4: ファイル・カレンダー | ファイル共有・Lightbox・カレンダー・マイルストーン・デッドライン表示 | M10・M11 |
| Phase 5: ミーティング・バックアップ | ミーティング作成・メンバー設定・スケジュール重複チェック・議事録・ToDo連携・メモ連携・バックアップ | M12・M14 |
| (横断) | 検索・ダッシュボード完成 | M13 |
| (全体) | 全体テスト完成・品質担保 | M15 |

---

## テスト要件サマリー

`docs/development-guidelines.md` の「テスト実装の必須条件」に準拠し、各マイルストーンでテスト実装を必須とする。

### Unit Test（Vitest）【必須】
- **対象**: SQLラッパー・Migration・全13Repository・全12Service・権限チェック・バリデーション・スケジュール重複判定・通知作成ロジック・アクティビティログ作成ロジック・マイルストーン進捗計算
- **合格基準**: `npm test` 全件成功・Repository/Service層カバレッジ80%以上・正常系/異常系網羅
- **最終確認**: M15

### 統合テスト（Vitest）【必須】
- **対象**: 認証フロー・プロジェクトメンバー権限・チャットSSE配信
- **最終確認**: M15

### E2E Test（Playwright）【必須】
- **対象**: 認証・プロジェクト管理・掲示板・チャット(SSE)・ToDo(Kanban)・ファイル共有(Lightbox)・Markdownメモ・カレンダー・ミーティング(予定重複警告)・通知・アクティビティログ・バックアップ（全12シナリオ）
- **合格基準**: `npm run test:e2e` 全件成功・主要フロー100%
- **最終確認**: M15
