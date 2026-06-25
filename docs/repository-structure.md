# リポジトリ構成定義書 (Repository Structure Document)

> 本書は `docs/architecture.md` で定義したレイヤードアーキテクチャを具体的なディレクトリ構成に落とし込んだものである。Next.js 15 App Router の規約に従い、`app/`・`lib/`・`repositories/`・`services/`・`components/` をルート直下に配置する。

## プロジェクト構成

```
repo/
├── app/                       # UI層: Next.js App Router
│   ├── api/                   # Route Handlers (REST/SSEエンドポイント)
│   ├── login/                 # ログイン画面
│   ├── dashboard/             # 個人ダッシュボード
│   ├── projects/[projectId]/  # プロジェクト内画面群
│   ├── profile/               # ユーザープロフィール
│   ├── admin/                 # 管理者画面（バックアップ等）
│   ├── layout.tsx             # ルートレイアウト
│   └── globals.css            # Tailwind エントリ
├── lib/                       # Data層 + 共通基盤
│   ├── db/                    # SQLite接続・Migration
│   ├── sse/                   # SSE配信基盤
│   ├── auth/                  # 認証・セッションヘルパ
│   ├── types/                 # Entity型定義
│   └── validators/            # 入力バリデーション
├── repositories/              # Repository層
├── services/                  # Service層
├── components/                # Reactコンポーネント
│   ├── layout/
│   ├── project/
│   ├── board/
│   ├── chat/
│   ├── todo/
│   ├── files/
│   ├── calendar/
│   ├── meetings/
│   ├── notes/
│   └── notifications/
├── tests/                     # テストコード
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── data/                      # 永続化データ（git管理外）
│   ├── app.db
│   └── uploads/
├── backups/                   # バックアップZIP（git管理外）
├── docs/                      # プロジェクトドキュメント
├── .steering/                 # ワーク単位のステアリングファイル
├── .opencode/                 # opencode設定
├── public/                    # 静的アセット
└── 設定ファイル群（package.json, tsconfig.json, next.config 等）
```

## ディレクトリ詳細

### app/ （UI層）

**役割**: Next.js App Router。画面表示・入力受付・認証・認可・Route Handler/SSEエンドポイント。

**配置ファイル**:
- `page.tsx`: 画面コンポーネント（Server Components 中心）
- `route.ts`: Route Handler（REST API）
- `layout.tsx`: レイアウト
- `loading.tsx` / `error.tsx`: ローディング・エラー状態

**命名規則**:
- ディレクトリはNext.js規約（`[projectId]`等の動的セグメント含む）
- 画面ディレクトリは kebab-case（`projects/[projectId]/board/`）

**依存**:
- 依存可能: `services/`, `components/`, `lib/`
- 依存禁止: `repositories/`, `lib/db/` への直接アクセス（Service経由のみ）

**構成例**:
```
app/
├── api/
│   ├── auth/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   └── me/route.ts
│   ├── projects/
│   │   ├── route.ts                       # 一覧・作成
│   │   └── [projectId]/
│   │       ├── route.ts                   # 詳細・編集・削除
│   │       ├── members/route.ts
│   │       ├── board/
│   │       ├── chat/
│   │       │   ├── messages/route.ts
│   │       │   └── stream/route.ts        # SSEエンドポイント
│   │       ├── todos/
│   │       ├── files/
│   │       ├── notes/
│   │       ├── calendar/
│   │       ├── milestones/
│   │       └── meetings/
│   ├── files/[fileId]/download/route.ts
│   ├── notifications/route.ts
│   └── admin/
│       ├── backups/route.ts
│       └── migrations/route.ts
├── login/page.tsx
├── dashboard/page.tsx
├── projects/[projectId]/
│   ├── page.tsx                           # プロジェクト概要/ダッシュボード
│   ├── board/page.tsx
│   ├── chat/page.tsx
│   ├── todos/page.tsx
│   ├── files/page.tsx
│   ├── notes/page.tsx
│   ├── calendar/page.tsx
│   ├── milestones/page.tsx
│   ├── meetings/page.tsx
│   ├── members/page.tsx
│   ├── activity/page.tsx
│   └── settings/page.tsx
├── profile/page.tsx
└── admin/backups/page.tsx
```

**各 Route Handler の先頭に `export const runtime = 'nodejs'` を明示する**（Edge Runtime使用禁止）。

### lib/ （Data層 + 共通基盤）

#### lib/db/

**役割**: SQLite接続の共通管理・SQL実行・Migration。

**配置ファイル**:
- `sqlite.ts`: `SqliteDatabase` クラス・`getDb()` シングルトン
- `migrator.ts`: `Migrator` クラス
- `migrations/*.sql`: Migrationファイル（ファイル名順実行）

**命名規則**: Migrationファイルは `001_initial.sql` 形式（3桁連番 + 説明）

**依存**: better-sqlite3。Repository層からのみ利用される。

#### lib/sse/

**役割**: プロジェクト単位のSSEクライアント管理・イベント配信。

**配置ファイル**:
- `hub.ts`: `SseHub` クラス（addClient/removeClient/broadcast）

**依存**: なし（Service層から呼び出される）。

#### lib/auth/

**役割**: セッション管理・認証ヘルパ・現在ユーザー取得。

**配置ファイル**:
- `session.ts`: セッション読み書き
- `getCurrentUser.ts`: リクエストから現在ユーザー解決

#### lib/types/

**役割**: Entity型定義・共有型。`functional-design.md` のデータモデルに対応。

**配置ファイル**: `User.ts`, `Project.ts`, `BoardThread.ts`, `ChatMessage.ts`, `TodoItem.ts`, `FileAsset.ts`, `ProjectNote.ts`, `Milestone.ts`, `CalendarEvent.ts`, `Meeting.ts`, `Notification.ts`, `ActivityLog.ts` 等

**命名規則**: PascalCase（Entity名）

#### lib/validators/

**役割**: 入力バリデーション（必須・長さ・形式）。Service層から呼び出される。

**配置ファイル**: `projectValidator.ts`, `todoValidator.ts`, `meetingValidator.ts` 等

**命名規則**: camelCase + `Validator` 接尾

### repositories/ （Repository層）

**役割**: SQLの保持・パラメータバインド実行・論理削除フィルタ（`deleted_at IS NULL`）・プロジェクト分離の担保。直接SQLiteライブラリを触らず `lib/db/sqlite.ts` 経由。

**配置ファイル**: テーブルごとに1クラス。

```
repositories/
├── UserRepository.ts
├── ProjectRepository.ts
├── ProjectMemberRepository.ts
├── BoardRepository.ts
├── ChatRepository.ts
├── TodoRepository.ts
├── FileRepository.ts
├── AttachmentRepository.ts
├── CalendarRepository.ts
├── MeetingRepository.ts
├── ProjectNoteRepository.ts
├── NotificationRepository.ts
├── ActivityLogRepository.ts
└── MilestoneRepository.ts
```

**命名規則**: PascalCase + `Repository` 接尾

**依存**:
- 依存可能: `lib/db/sqlite.ts`, `lib/types/`
- 依存禁止: `services/`, `app/`, `lib/sse/`（業務ロジック・配信を持たない）

### services/ （Service層）

**役割**: 業務ロジック・権限チェック・トランザクション境界・副作用（通知生成・アクティビティログ記録・SSE配信）。

**配置ファイル**:
```
services/
├── AuthService.ts
├── ProjectService.ts
├── ChatService.ts
├── MeetingService.ts
├── ScheduleService.ts
├── FileStorageService.ts
├── AttachmentService.ts
├── BackupService.ts
├── TodoService.ts
├── BoardService.ts
├── NoteService.ts
├── NotificationService.ts
└── ActivityLogService.ts
```

**命名規則**: PascalCase + `Service` 接尾

**依存**:
- 依存可能: `repositories/`, `lib/sse/`, `lib/validators/`, `lib/types/`, `lib/db/`（トランザクションのため）
- 依存禁止: `app/`（UI層への依存）

### components/ （Reactコンポーネント）

**役割**: 再利用可能なUIコンポーネント。機能領域ごとに分割。

**配置ファイル**: 機能ディレクトリ配下にコンポーネント。
```
components/
├── layout/              # Header, Sidebar, ProjectNav
├── project/             # ProjectCard, DashboardWidget
├── board/               # ThreadList, ThreadForm, CommentList
├── chat/                # ChatWindow, MessageInput, MessageList
├── todo/                # KanbanBoard, KanbanColumn, TodoCard
├── files/               # FileList, Uploader, Lightbox, AttachmentList, AttachmentPicker
├── calendar/            # CalendarView, MonthView, WeekView, DayView, EventDetailDialog, CalendarEventForm
├── meetings/            # MeetingForm, ConflictWarning
├── notes/               # NoteEditor, MarkdownPreview
└── notifications/       # NotificationList, NotificationBadge
```

**命名規則**: コンポーネントファイルは PascalCase（`KanbanBoard.tsx`）

**依存**: `app/` から利用される。`services/` 型・`lib/types/` を参照可能。直接 `repositories/` は触らない。

### tests/ （テストディレクトリ）

#### tests/unit/

**役割**: Unit Test（Vitest）。本番コードと同じ構造をミラーする。

**構成**:
```
tests/unit/
├── lib/db/sqlite.test.ts
├── lib/db/migrator.test.ts
├── lib/sse/hub.test.ts
├── repositories/UserRepository.test.ts
├── repositories/ProjectRepository.test.ts
├── ...
└── services/ChatService.test.ts
```

**命名規則**: `[対象ファイル].test.ts`（対象と同名 + `.test`）

#### tests/integration/

**役割**: 統合テスト。実際のSQLite（一時ファイル）を使用。

**構成**:
```
tests/integration/
├── auth-flow.test.ts
├── project-member-permission.test.ts
└── chat-sse-broadcast.test.ts
```

**命名規則**: `[シナリオ].test.ts`（kebab-case）

#### tests/e2e/

**役割**: E2E Test（Playwright）。ユーザーシナリオごとに分割。

**構成**:
```
tests/e2e/
├── auth.spec.ts
├── project-management.spec.ts
├── board.spec.ts
├── chat-sse.spec.ts
├── todo-kanban.spec.ts
├── file-sharing.spec.ts
├── markdown-notes.spec.ts
├── calendar.spec.ts
├── meetings.spec.ts
├── notifications.spec.ts
├── activity-log.spec.ts
└── backup.spec.ts
```

**命名規則**: `[領域].spec.ts`

### data/ ・ backups/ （永続化データ）

**役割**: SQLite DBファイル・アップロードファイル・バックアップZIPの永続化先。git管理外。

```
data/
├── app.db                       # SQLite DBファイル
└── uploads/<projectId>/<uuid>.<ext>
backups/
└── backup-<timestamp>.zip
```

### docs/ （ドキュメント）

**配置ファイル**:
- `product-requirements.md`: PRD
- `functional-design.md`: 機能設計書
- `architecture.md`: アーキテクチャ設計書
- `repository-structure.md`: 本書
- `development-guidelines.md`: 開発ガイドライン
- `glossary.md`: 用語集
- `ideas/`: ブレインストーミング成果物

### .steering/ （ステアリングファイル）

**役割**: ワーク単位の要件・設計・タスクリスト。

**構成**:
```
.steering/[YYYYMMDD]-[task-name]/
├── requirements.md
├── design.md
└── tasklist.md
```

**命名規則**: `20250115-add-user-profile` 形式

### .opencode/ （opencode設定）

**役割**: opencode設定・カスタマイズ。

**構成**: `command/`, `skills/`, `agent/`

## ファイル配置ルール

### ソースファイル

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| Route Handler | `app/api/.../route.ts` | `route.ts`（固定） | `app/api/projects/route.ts` |
| 画面 | `app/.../page.tsx` | `page.tsx`（固定） | `app/dashboard/page.tsx` |
| Repository | `repositories/` | PascalCase + `Repository` | `UserRepository.ts` |
| Service | `services/` | PascalCase + `Service` | `ChatService.ts` |
| SQLラッパ | `lib/db/` | camelCase | `sqlite.ts` |
| Migration | `lib/db/migrations/` | `NNN_description.sql` | `001_initial.sql` |
| Entity型 | `lib/types/` | PascalCase | `TodoItem.ts` |
| バリデータ | `lib/validators/` | camelCase + `Validator` | `todoValidator.ts` |
| Reactコンポーネント | `components/<area>/` | PascalCase | `KanbanBoard.tsx` |
| ユーティリティ関数 | `lib/` 配下の適切な領域 | camelCase + 動詞始まり | `formatDate.ts` |

### テストファイル

| テスト種別 | 配置先 | 命名規則 | 例 |
|-----------|--------|---------|-----|
| Unit test | `tests/unit/` | `[対象].test.ts` | `ChatService.test.ts` |
| Integration test | `tests/integration/` | `[シナリオ].test.ts` | `chat-sse-broadcast.test.ts` |
| E2E test | `tests/e2e/` | `[領域].spec.ts` | `todo-kanban.spec.ts` |

### 設定ファイル

| ファイル種別 | 配置先 | 命名規則 |
|------------|--------|---------|
| ツール設定 | プロジェクトルート | `[tool].config.{js,ts,mjs}`（`next.config.mjs`, `vitest.config.ts`, `playwright.config.ts`） |
| 環境変数 | プロジェクトルート | `.env`, `.env.example` |
| TypeScript設定 | プロジェクトルート | `tsconfig.json` |

## 命名規則

### ディレクトリ名
- **レイヤディレクトリ**: 複数形・kebab-case（`repositories/`, `services/`, `components/`）
- **機能ディレクトリ**: 単数形・kebab-case（`board/`, `chat/`, `meetings/`）※画面はNext.js規約に従う
- **汎用ディレクトリ名禁止**: `utils/`, `misc/`, `common/` は役割が曖昧になるため避ける

### ファイル名
- **クラスファイル**: PascalCase + 役割接尾（`UserRepository.ts`, `ChatService.ts`）
- **関数ファイル**: camelCase + 動詞始まり（`formatDate.ts`, `validateEmail.ts`）
- **型定義**: PascalCase（`TodoItem.ts`）
- **Route Handler/画面**: Next.js固定名（`route.ts`, `page.tsx`, `layout.tsx`）

## 依存規則

### レイヤ間の依存

```
app/ (UI層)
    ↓ (OK)
services/ (Service層)
    ↓ (OK)
repositories/ (Repository層)
    ↓ (OK)
lib/db/ (Data層)
```

**禁止依存**:
- `lib/db/` → `repositories/`/`services/`/`app/`（下位から上位へ ❌）
- `repositories/` → `services/`/`app/`（❌）
- `services/` → `app/`（❌）
- `app/` → `repositories/`/`lib/db/` の直接アクセス（層飛ばし ❌、Service経由のみ）
- `repositories/` → better-sqlite3 直接（❌、`lib/db/sqlite.ts` 経由のみ）

```typescript
// ✅ 許容: UI → Service → Repository → Data
import { projectService } from '@/services/ProjectService';
// ProjectService内:
import { projectRepository } from '@/repositories/ProjectRepository';
// ProjectRepository内:
import { getDb } from '@/lib/db/sqlite';

// ❌ 禁止: Route HandlerがRepositoryを直接呼ぶ
import { projectRepository } from '@/repositories/ProjectRepository'; // app/api/... から ❌
```

### モジュール間の依存

**循環依存禁止**: Service間で循環依存が生じる場合は、共有型を `lib/types/` に抽出するか、共通機能を別Service（例: `NotificationService`, `ActivityLogService`）に切り出す。

```typescript
// ❌ 循環依存
// services/TaskService.ts
import { UserService } from './UserService';
// services/UserService.ts
import { TaskService } from './TaskService';

// ✅ 解決: 共通副作用を別Serviceに切り出し
// services/NotificationService.ts  ← 両方から利用
// services/ActivityLogService.ts   ← 両方から利用
```

### パスエイリアス

`tsconfig.json` で `@/*` をプロジェクトルートにマッピングし、相対パスの深い `../../` を避ける。

```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

## スケーリング戦略

### 機能追加時の配置方針

1. **小機能**: 既存ディレクトリに追加（例: 新しいRepository → `repositories/` に1ファイル）
2. **中機能**: レイヤ内にサブディレクトリ作成（例: `services/meeting/` 配下に複数Service）
3. **大機能**: 独立モジュール化を検討

### ファイルサイズ管理

- 1ファイル **300行以下** 推奨
- 300-500行: リファクタリング検討
- 500行超: 分割推奨（責務ごとに分割。例: `TaskService.ts` → `TaskService.ts` + `TaskValidationService.ts` + `TaskNotificationService.ts`）

### モジュール分離のタイミング

以下の兆候があれば機能単位のモジュール化を検討:
- 1ディレクトリに10ファイル超
- 関連機能がグループ化されている
- 独立してテスト可能
- 他機能への依存が少ない

## 除外設定

### .gitignore

除外対象:
- `node_modules/`
- `.next/`
- `dist/`
- `coverage/`
- `data/`（DB・uploads・一時データ）
- `backups/`
- `.env`
- `.steering/`（タスク管理の一時ファイル）
- `*.log`
- `test-results/`, `playwright-report/`
- `.DS_Store`

### ツール除外

`.prettierignore`, `.eslintignore`:
- `dist/`, `node_modules/`, `.next/`, `coverage/`, `data/`, `backups/`

## チェックリスト

- [x] 各ディレクトリの役割が明確に定義されている
- [x] レイヤ構造がディレクトリに反映されている
- [x] 命名規則が一貫している
- [x] テストコードの配置方針が決まっている
- [x] 依存規則が明確である
- [x] 循環依存を避ける方針がある
- [x] スケーリング戦略が考慮されている
- [x] 共有コードの配置ルールが定義されている（`lib/types/`, `lib/validators/`）
- [x] 設定ファイルの管理方法が決まっている
- [x] ドキュメントの配置が明確である
