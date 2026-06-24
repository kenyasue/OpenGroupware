# アーキテクチャ設計書 (Architecture Design Document)

> 本書は `docs/product-requirements.md` と `docs/functional-design.md` を技術的に実現するためのシステム構造・技術選定・インフラ要件を定義する。

## 技術スタック

### 言語・ランタイム

| 技術 | バージョン | 選定理由 |
|------|-----------|----------|
| Node.js | v24.11.0 | 開発環境(devcontainer)と同一。better-sqlite3の同期APIを直接扱える。LTS保証下で本番運用が安定 |
| TypeScript | 5.x | 静的型付けによりコンパイル時バグ検出。Repository/Service/Entity間の型共有で保守性向上。IDE補完により開発効率向上 |
| npm | 11.x | Node.js v24.11.0にバンドル。package-lock.jsonによる厳密な依存管理。workspaces対応 |

### フレームワーク・ライブラリ

| 技術 | バージョン | 目的 | 選定理由 |
|------|-----------|------|----------|
| Next.js | 15 | Webフレームワーク | App Router・Server Components・Route Handlers・Server Actionsを統合利用。Node.js Runtime選択可能でSQLite直接操作に適合 |
| better-sqlite3 | 最新安定 | SQLiteドライバ | 同期APIで扱いやすく高速。トランザクション・プリペアドステートメント・pragma制御が直接可能 |
| react-markdown | 最新安定 | Markdownレンダリング | GFM拡張と連携可能。プラグインでサニタイズパイプラインを構築できる |
| remark-gfm | 最新安定 | GFM対応 | テーブル・チェックリスト・取り消し線等のGFM記法を有効化 |
| rehype-sanitize | 最新安定 | HTMLサニタイズ | Markdown表示時のXSS対策。危険なHTML・URLスキームを除去 |
| Tailwind CSS | 最新安定 | スタイリング | ユーティリティファーストでUI構築が高速。カスタムCSS削減 |
| bcrypt | 最新安定 | パスワードハッシュ | ソルト付きハッシュで平文保存を回避。適切なコスト係数でブルートフォース耐性 |
| FullCalendar系 または独自実装 | - | カレンダーUI | 月/週/日/リスト表示・ドラッグ操作・イベントフィルタ要件を満たす |

### 開発ツール

| 技術 | バージョン | 目的 | 選定理由 |
|------|-----------|------|----------|
| Vitest | 最新安定 | Unit Test | Viteベースで高速。TypeScriptネイティブ対応。better-sqlite3等のネイティブモジュールも扱える |
| Playwright | 最新安定 | E2E Test | 実ブラウザ（Chromium/Firefox/WebKit）操作で主要ユーザーフローを検証。SSEのリアルタイム挙動も検証可能 |
| ESLint | 最新安定 | リンタ | コード品質・一貫性維持。TypeScriptルールと連携 |
| TypeScript（tsc） | 5.x | 型チェック | 型エラーをCIで検出 |

## アーキテクチャパターン

### レイヤードアーキテクチャ

```
┌─────────────────────────────────────────────┐
│  UI層 (Next.js)                              │ ← Server Components / Client Components
│   Route Handler / Server Action / SSE        │   入力受付・表示・認証・認可
├─────────────────────────────────────────────┤
│  Service層                                   │ ← 業務ロジック・権限チェック・トランザクション
│   AuthService / ProjectService / ...         │   通知生成・アクティビティログ・SSE配信
├─────────────────────────────────────────────┤
│  Repository層                                │ ← SQL保持・データアクセス・論理削除フィルタ
│   UserRepository / ProjectRepository / ...   │
├─────────────────────────────────────────────┤
│  Data層                                      │ ← SQLite接続・SQL実行・Migration
│   lib/db/sqlite.ts / migrator.ts / SQLite    │
└─────────────────────────────────────────────┘
```

### レイヤ責務と依存規則

依存は一方向（UI → Service → Repository → Data）のみ許可する。逆方向依存・層飛ばしを禁止する。

#### UI層（Route Handler / Server Action / Server Components / SSEエンドポイント）
- **責務**: 入力受付・バリデーション・認証・認可・結果表示
- **許可操作**: Service層の呼び出し
- **禁止操作**: Repository層・Data層への直接アクセス、SQLの直接記述

#### Service層
- **責務**: 業務ロジック・権限チェック（`isMember`/ロール）・トランザクション境界・副作用（通知生成・アクティビティログ記録・SSE配信）
- **許可操作**: Repository層の呼び出し・FileStorageServiceによるファイル操作・SseHubへの配信依頼
- **禁止操作**: UI層への依存、SQLの直接記述、SQLiteライブラリの直接操作

#### Repository層
- **責務**: SQLの保持・パラメータバインド実行・論理削除（`deleted_at IS NULL`）の確実な付与・プロジェクト分離の担保
- **許可操作**: SQLラッパー（`lib/db/sqlite.ts`）経由のDBアクセス
- **禁止操作**: 業務ロジックの実装、SQLiteライブラリの直接操作、UI層への依存

#### Data層
- **責務**: SQLite接続の共通管理・SQL実行・トランザクション・Migration
- **許可操作**: better-sqlite3へのアクセス・ファイルシステム（Migrationファイル・バックアップ）へのアクセス
- **禁止操作**: 業務ロジックの実装

```typescript
// 許容: UI → Service → Repository → Data
routeHandler → projectService.createProject(...) → projectRepository.create(...) → db.execute(sql, params)

// 禁止: UI → Data (層飛ばし)
routeHandler → db.execute("INSERT INTO projects ...") // ❌

// 禁止: Repository → SQLite直接 (ラッパー未使用)
projectRepository → new Database(dbPath) // ❌
```

### ランタイム方針

SQLiteを直接扱うため、Next.jsのEdge Runtimeは使用しない。API Route・Server Actions・DBアクセス処理・SSEエンドポイントはすべてNode.js Runtimeで実行する。各Route Handlerの先頭で `export const runtime = 'nodejs'` を明示する。

### Prisma不使用の方針

DBアクセスは独自SQLラッパー（`lib/db/sqlite.ts`）とRepositoryクラスで実装する。Prismaは導入しない。
- 理由1: SQLを直接制御することでクエリ最適化・インデックス設計を明示できる
- 理由2: better-sqlite3の同期APIと相性が良く、コード生成のオーバーヘッドがない
- 理由3: MigrationもSQLファイルベースの独自実装でバージョン管理する

## データ永続化戦略

### 保存方式

| データ種別 | 保存先 | 形式 | 理由 |
|-----------|----------|-------------|------|
| アプリケーションデータ | SQLite（`./data/app.db`） | リレーショナル | トランザクション・外部キー・インデックス・論理削除を一貫管理 |
| アップロードファイル | ローカルFS（`./data/uploads/<projectId>/`） | バイナリ | 外部ストレージ不要・自己完結。DBにメタデータ（`file_assets`）を保存 |
| Migration履歴 | SQLite（`schema_migrations`） | 行レコード | 適用済みファイルを一意管理・再実行回避 |
| バックアップ | ローカルFS（`./backups/`） | ZIP | DBファイル+uploadsディレクトリをZIP化 |

### SQLite接続設定

- `journal_mode = WAL`: 読み書きの並行性向上
- `foreign_keys = ON`: 外部キー制約・カスケード削除を有効化
- 接続はシングルトン（`getDb()`）で共有。dbPathは `process.env.SQLITE_PATH ?? "./data/app.db"`

### バックアップ戦略

- **作成タイミング**: 管理者がバックアップ画面から手動実行
- **作成内容**: SQLite DBファイル + uploadsディレクトリをZIP化
- **保存先**: `./backups/backup-<timestamp>.zip`
- **世代管理**: 一覧表示・ダウンロード可能（世代数は運用で定義）
- **リストア手順**: サーバ停止 → ZIP展開 → `./data/app.db` と `./data/uploads/` を差替 → サーバ再起動

## パフォーマンス要件

### 応答時間

| 操作 | 目標時間 | 測定環境 |
|------|---------|---------|
| チャットSSE配信遅延 | 送信から全クライアント受信まで3秒以内（95パーセンタイル） | 小規模同時接続（数十） |
| 一覧画面表示 | 1000件データ時1秒以内（掲示板・チャット履歴・ファイル一覧・Markdownメモ） | ページネーション20件/頁 |
| バックアップ作成 | DB+uploads合計100MB相当で30秒以内 | ローカルFS |
| Migration実行 | 1ファイル1トランザクション・失敗時即座ロールバック | 初回スキーマ適用 |

### リソース使用量

| リソース | 上限 | 理由 |
|---------|------|------|
| メモリ | Next.jsサーバプロセス1GB程度 | 1プロジェクト数十人規模・小規模同時接続前提 |
| CPU | 単一サーバで十分 | SQLite同期処理・SSE数十接続を想定 |
| ディスク | DB+uploads合計数百MB〜数GBを想定 | バックアップは別途容量確保 |

### パフォーマンス最適化施策

- **ページネーション**: 全一覧APIで `?page=&pageSize=` を必須化し必要件数のみ取得
- **インデックス**: `project_notes(project_id)`, `project_notes(updated_at)` 等の高頻度検索カラムにインデックス付与
- **Server Components**: 可能な限りServer Componentsでデータ取得しクライアント送信量を削減
- **WALモード**: 読み書き並行性向上
- **SSE配信のスコープ限定**: プロジェクト単位でクライアント集合を管理し、無関係プロジェクトへの配信コストを排除

## セキュリティアーキテクチャ

### データ保護

- **パスワード保護**: bcryptでハッシュ化保存。平文保存禁止。ソルト付き・適切なコスト係数
- **暗号化**: 通信はHTTPS前提。保存時のDBファイル暗号化は本スコープ外（ローカルFSのアクセス権限で保護）
- **アクセス制御**: サーバプロセスのファイル権限により `./data/`, `./backups/` を保護
- **機密情報管理**: 設定は `.env` で管理（`SQLITE_PATH` 等）。コード内にハードコード禁止。`.env` はリポジトリにコミットしない

### 認証・認可

- **認証**: 独自ログイン方式・セッションベース。未認証リクエストは保護画面/APIにアクセス不可（401/リダイレクト）
- **認可（プロジェクト）**: Service層で `ProjectMemberRepository.isMember(projectId, userId)` を必ず実施。非参加者は403
- **認可（管理者機能）**: バックアップ・Migration状態確認は `role='system_admin'` のみ許可
- **ファイルアクセス**: ダウンロードAPIでもプロジェクト参加権限をチェック

### 入力バリデーション

- **バリデーション**: 全入力で必須チェック・長さ制限（タイトル1-200文字等）・形式チェックをService層で実施
- **SQL対策**: 全SQLをパラメータバインドで実行。文字列結合によるSQL構築は禁止
- **Markdownサニタイズ**: HTML直接入力無効化 + rehype-sanitize でサニタイズ + 危険URLスキーム（`javascript:`等）除外
- **ファイルアップロード**: MIMEタイプチェック・ファイル名サニタイズ・保存名の一意化（`<uuid>.<ext>`）
- **エラー表示**: スタックトレース・内部情報を本番では非表示。ユーザーには抽象メッセージのみ表示

### 監査

- 管理者操作・主要な変更操作をアクティビティログに記録（`activity_logs` テーブル）

## スケーラビリティ設計

### データ増大への対応

- **想定データ量**: 1プロジェクトあたり数十人・数千〜数万レコード（チャット・掲示板・アクティビティログが主要）
- **性能劣化対策**:
  - ページネーションによる取得件数制限
  - インデックス最適化（検索頻度高いカラム）
  - 論理削除データの取得除外（`deleted_at IS NULL` を全取得クエリに付与）
- **アーカイブ戦略**: 完了/アーカイブ済みプロジェクトは `status='archived'` で残置。大量データの物理削除は本スコープ外（運用で判断）

### 拡張性

- **プラグインシステム**: なし（本スコープ外）
- **設定カスタマイズ**: `.env` による設定管理（`SQLITE_PATH`・ uploadsパス等）
- **API拡張性**: Route Handlerベースでリソースごとにエンドポイントを分割。将来の公開REST API化はPost-MVP
- **SSEイベント拡張**: `SseEvent` 型に新種別を追加するだけで新イベント配信が可能

## テスト戦略

### Unit Test
- **フレームワーク**: Vitest
- **対象**: SQLラッパー・Migration・全Repository・全Service・権限チェック・バリデーション・スケジュール重複判定・通知作成ロジック・アクティビティログ作成ロジック・マイルストーン進捗計算
- **カバレッジ目標**: Repository/Service層 80%以上
- **実行コマンド**: `npm test`

### 統合テスト
- **方法**: Vitestで実際のSQLite（一時ファイル）を使用
- **対象**: 認証フロー・プロジェクト作成→メンバー追加→権限分離・チャット送信→SSE配信

### E2E Test
- **ツール**: Playwright
- **シナリオ**: 認証・プロジェクト管理・掲示板・チャット（SSEリアルタイム）・ToDo（ドラッグ&ドロップ）・ファイル共有（Lightbox）・Markdownメモ・カレンダー・ミーティング（予定重複警告）・通知・アクティビティログ・バックアップ
- **実行コマンド**: `npm run test:e2e`

## 技術的制約

### 環境要件
- **OS**: devcontainer（開発）/ Linux想定（本番）。Windows・macOSでもNode.js Runtime動作可能
- **最小メモリ**: 1GB
- **必要ディスク**: DB+uploads+backups（数百MB〜数GB）
- **必須外部依存**: なし（外部DB・外部ストレージ・外部IdPに非依存・自己完結）

### パフォーマンス制約
- 1プロジェクトあたり数十人規模を想定（数百人規模はスコープ外）
- チャットSSEは小規模同時接続（数十接続）を前提
- 一覧取得は必ずページネーション（全件取得禁止）

### セキュリティ制約
- 認証必須（`/api/auth/*`除く）
- 全SQLパラメータバインド（文字列結合禁止）
- Markdown表示時のHTML無効化・サニタイズ必須
- パスワード平文保存禁止

### ランタイム制約
- Edge Runtime使用禁止（SQLite直接操作のため全てNode.js Runtime）
- Prisma使用禁止

## 依存管理

| ライブラリ | 目的 | バージョン管理方針 |
|-----------|------|-------------------|
| next | フレームワーク | 固定（破壊的変更リスク大） |
| react / react-dom | UI | ^（マイナーアップ許容） |
| better-sqlite3 | SQLiteドライバ | ^（ネイティブビルド要注意） |
| react-markdown / remark-gfm / rehype-sanitize | Markdown | ^（マイナーアップ許容） |
| bcrypt | パスワードハッシュ | ^ |
| tailwindcss | スタイリング | ^ |
| typescript | 型チェック | ~（パッチのみ自動・devDependencies） |
| vitest | Unit Test | ^（devDependencies） |
| @playwright/test | E2E Test | ^（devDependencies） |
| eslint | リンタ | ^（devDependencies） |

**方針**:
- 安定版は `^` でマイナーアップを許容
- 破壊的変更リスクのあるもの（next等）は固定
- devDependenciesは `~` でパッチのみ自動アップ許容
- package-lock.jsonで厳密にロックしCIで再現性を担保

## チェックリスト

- [x] 全技術選定に理由が記載されている
- [x] レイヤードアーキテクチャが明確に定義されている（依存規則含む）
- [x] パフォーマンス要件が測定可能である
- [x] セキュリティ考慮事項が文書化されている
- [x] スケーラビリティが考慮されている
- [x] バックアップ戦略が定義されている
- [x] 依存管理方針が明確である
- [x] テスト戦略が定義されている
