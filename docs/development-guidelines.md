# 開発ガイドライン (Development Guidelines)

> 本書はシンプルグループウェアのチーム開発におけるコーディング規約と開発プロセスを定義する。技術スタックは `docs/architecture.md`、ディレクトリ構成は `docs/repository-structure.md` に基づく。

## コーディング規約

### 命名規約

#### 変数・関数

```typescript
// ✅ 良い例: 役割が明確
const projectMembers = await projectMemberRepository.findByProject(projectId);
function formatDueDate(dueDate: string): string { }
const hasPermission = await projectMemberRepository.isMember(projectId, userId);

// ❌ 悪い例: 曖昧
const data = await repo.find(id);
function calc(arr: any[]): number { }
```

**原則**:
- 変数: camelCase・名詞または名詞句
- 関数: camelCase・動詞始まり（`find`, `create`, `update`, `delete`, `format`, `validate`）
- 定数: UPPER_SNAKE_CASE（`MAX_PAGE_SIZE`, `DEFAULT_PAGE_SIZE`）
- 真偽値: `is`, `has`, `should`, `can` 始まり（`isMember`, `hasPermission`）

#### クラス・インターフェース・型

```typescript
// クラス: PascalCase + 役割接尾
class UserRepository { }
class ChatService { }
class SqliteDatabase { }

// インターフェース: PascalCase（接尾辞Iは付けない）
interface ProjectMember { }
interface CreateMeetingInput { }

// 型エイリアス: PascalCase
type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
type NotificationType = 'mention' | 'todo_assigned' | ...;
```

#### ファイル名

- Repository/Serviceクラス: PascalCase + 接尾（`UserRepository.ts`, `ChatService.ts`）
- 関数・ユーティリティ: camelCase・動詞始まり（`formatDate.ts`, `validateEmail.ts`）
- 型定義: PascalCase（`TodoItem.ts`）
- Reactコンポーネント: PascalCase（`KanbanBoard.tsx`）
- Route Handler/画面: Next.js固定名（`route.ts`, `page.tsx`, `layout.tsx`）
- Migration: `NNN_description.sql`（`001_initial.sql`）

### コードフォーマット

- **インデント**: 2スペース
- **行長**: 最大100文字
- **セミコロン**: 必須
- **クォート**: シングルクォート
- **ツール**: Prettier（`.prettierrc`）+ ESLint（`eslint.config.js` Flat Config）で自動整形

### TypeScript規約

#### 型定義

```typescript
// ✅ 良い例: 明示的な型注釈
function findByProject(projectId: number): ProjectMember[] { }

// ❌ 悪い例: 型推論への過度な依存（暗黙のany）
function findByProject(projectId) { }
```

- 公開APIの引数・戻り値には明示的な型注釈を付ける
- `any` は原則禁止。やむを得ない場合は `unknown` + 型ガードを使用
- オブジェクト型は `interface`、共用型・プリミティブ型は `type` エイリアスを使用
- Entity型は `lib/types/` に集約し、レイヤ間で共有する

#### 関数設計

```typescript
// ✅ 良い例: 単一責任・パラメータをオブジェクトに集約
interface CreateTodoInput {
  title: string;
  description?: string;
  assigneeId?: number;
  dueDate?: string;
  priority?: TodoPriority;
}
function createTodo(input: CreateTodoInput): TodoItem { }

// ❌ 悪い例: 多すぎるパラメータ
function createTodo(title, description, assigneeId, dueDate, priority, milestoneId): TodoItem { }
```

- 1関数の責務は単一に（目安20行以内・50行推奨上限）
- パラメータが4つ超の場合はオブジェクトに集約
- 1ファイル300行以下推奨・500行超は分割

### コメント規約

#### ドキュメントコメント（TSDoc）

```typescript
/**
 * プロジェクトにメンバーを追加する
 *
 * @param actorId - 操作実行者のユーザーID（権限チェックに使用）
 * @param projectId - 対象プロジェクトID
 * @param userId - 追加するユーザーID
 * @param role - プロジェクト内ロール
 * @throws {ForbiddenError} 実行者に権限がない場合
 * @throws {NotFoundError} プロジェクトまたはユーザーが存在しない場合
 */
async function addMember(
  actorId: number,
  projectId: number,
  userId: number,
  role: ProjectMemberRole
): Promise<void> { }
```

#### インラインコメント

```typescript
// ✅ 良い例: 理由を説明する
// 論理削除済みデータを除外するため deleted_at IS NULL を付与
const threads = db.query<BoardThread>(`
  SELECT * FROM board_threads
  WHERE project_id = @projectId AND deleted_at IS NULL
`, { projectId });

// ❌ 悪い例: コードの再述
// スレッドを取得する
const threads = db.query(...);
```

- コードから自明な内容は書かない
- 「なぜ」その処理をするかを書く
- TODO/FIXMEは課題番号と共に記載（`// TODO: キャッシュを実装する (Issue #123)`）
- コメントアウトされたコードは残さない（削除する）

### エラーハンドリング

#### カスタムエラークラス

```typescript
// 期待されるエラー: 適切なエラークラスを定義
class ValidationError extends Error {
  constructor(message: string, public field: string, public value: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends Error {
  constructor(public resource: string, public id: number | string) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}
```

#### エラー処理パターン

```typescript
// ✅ 良い例: 期待されるエラーは適切に処理、予期せぬエラーは伝播
async function getThread(threadId: number): Promise<BoardThread> {
  const thread = await boardRepository.findThreadById(threadId);
  if (!thread) {
    throw new NotFoundError('BoardThread', threadId);
  }
  return thread;
}

// Route HandlerでのHTTPステータスへの変換
try {
  const thread = await boardService.getThread(threadId);
  return Response.json(thread);
} catch (error) {
  if (error instanceof ValidationError) return Response.json({ error: { message: error.message } }, { status: 400 });
  if (error instanceof ForbiddenError) return Response.json({ error: { message: error.message } }, { status: 403 });
  if (error instanceof NotFoundError) return Response.json({ error: { message: error.message } }, { status: 404 });
  console.error('Unexpected error:', error);
  return Response.json({ error: { message: '内部エラーが発生しました' } }, { status: 500 });
}

// ❌ 悪い例: エラーを無視して null を返す
async function getThread(threadId: number): Promise<BoardThread | null> {
  try {
    return await boardRepository.findThreadById(threadId);
  } catch (error) {
    return null; // エラー情報が失われる
  }
}
```

**原則**:
- 期待されるエラー（バリデーション・権限・存在確認）は適切なエラークラスで表現
- 予期せぬエラーは上位に伝播しログに記録
- エラーを無視（空catch）しない
- エラーメッセージは具体的で解決策を示す（`'タイトルは1-200文字で入力してください。現在: 250文字'`）

## プロジェクト固有規約

### Repository層の規約

#### SQLは必ずパラメータバインド

```typescript
// ✅ 良い例: パラメータバインド
const user = db.get<User>('SELECT * FROM users WHERE email = @email', { email });

// ❌ 悪い例: 文字列結合（SQLインジェクション脆弱性）
const user = db.get<User>(`SELECT * FROM users WHERE email = '${email}'`);
```

#### 論理削除テーブルの取得には必ず deleted_at IS NULL

```typescript
// ✅ 良い例
const notes = db.query<ProjectNote>(`
  SELECT * FROM project_notes
  WHERE project_id = @projectId AND deleted_at IS NULL
  ORDER BY is_pinned DESC, updated_at DESC
  LIMIT @limit OFFSET @offset
`, { projectId, limit, offset });

// ❌ 悪い例: 削除済みデータが混入
const notes = db.query<ProjectNote>(`SELECT * FROM project_notes WHERE project_id = @projectId`, { projectId });
```

#### Repositoryは直接SQLiteライブラリを触らない

```typescript
// ✅ 良い例: SQLラッパー経由
import { getDb } from '@/lib/db/sqlite';
const db = getDb();
db.execute('INSERT INTO projects ...', params);

// ❌ 悪い例: better-sqlite3を直接操作
import Database from 'better-sqlite3';
const db = new Database('./data/app.db');
```

#### ページネーション

一覧取得APIは必ずページネーション（`LIMIT`/`OFFSET`）し、全件取得しない。

```typescript
function findThreads(projectId: number, page: number, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;
  return db.query<BoardThread>(`
    SELECT * FROM board_threads
    WHERE project_id = @projectId AND deleted_at IS NULL
    ORDER BY is_pinned DESC, created_at DESC
    LIMIT @pageSize OFFSET @offset
  `, { projectId, pageSize, offset });
}
```

### Service層の規約

#### 権限チェックを必ず実施

```typescript
// ✅ 良い例: 操作前に権限チェック
async function addMember(actorId: number, projectId: number, userId: number, role: ProjectMemberRole) {
  const actorRole = await projectMemberRepository.getRole(projectId, actorId);
  if (!actorRole || actorRole !== 'admin') {
    throw new ForbiddenError('プロジェクト管理者のみメンバー追加が可能です');
  }
  // ...メンバー追加処理
}
```

#### トランザクション境界の明示

複数テーブルを更新する場合はトランザクション内で実行する。

```typescript
async function createMeeting(actorId: number, projectId: number, input: MeetingInput) {
  return db.transaction(() => {
    const meeting = meetingRepository.create({ ...input, projectId, createdById: actorId });
    meetingRepository.addMembers(meeting.id, input.memberIds);
    activityLogService.log({ projectId, actorId, action: 'meeting_created', targetType: 'meeting', targetId: meeting.id });
    return meeting;
  });
}
```

#### 副作用の分離

通知生成・アクティビティログ記録・SSE配信は専用Service（`NotificationService`, `ActivityLogService`, `SseHub`）に委譲し、業務ロジックと分離する。

### Next.js規約

#### Node.js Runtimeの明示

```typescript
// app/api/.../route.ts の先頭
export const runtime = 'nodejs';  // Edge Runtime使用禁止
```

#### Server Componentsを優先

データ取得は可能な限りServer Componentsで行い、クライアント送信量を削減する。インタラクティブな要素（ドラッグ&ドロップ・SSE受信・フォーム）のみClient Componentsとする。

#### Markdownレンダリングの安全性

```typescript
// ✅ 必ず rehype-sanitize を通す
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
  {bodyMd}
</ReactMarkdown>
```

HTML直接入力は無効化し、危険なURLスキーム（`javascript:`等）は除外する。

### セキュリティ規約

- 機密情報（パスワード・APIキー）はコードにハードコードしない。`.env` で管理
- パスワードは bcrypt でハッシュ化保存
- ファイルアップロードはMIMEタイプチェック・ファイル名サニタイズ・保存名の一意化
- ファイルアクセスAPIでもプロジェクト参加権限をチェック
- 管理者機能（バックアップ・Migration状態）は `role='system_admin'` のみ許可

## Gitワークフロー規則

### ブランチ戦略（Git Flow）

```
main (本番環境)
└── develop (開発統合)
    ├── feature/task-management
    ├── feature/user-auth
    ├── fix/chat-sse-reconnect
    └── refactor/todo-repository
```

**運用ルール**:
- `main`: リリース済みの安定コードのみ。タグでバージョン管理
- `develop`: 次回リリースの最新開発コード。CIで自動テスト実行
- `feature/*`, `fix/*`: developから分岐しPR経由でdevelopへマージ
- `release/*`: リリース準備（必要に応じて）
- `hotfix/*`: 本番障害対応（mainから分岐しmain/develop両方へマージ）
- 直接コミット禁止: 全ブランチでPRレビュー必須
- マージ方針: feature→develop はsquash merge推奨、develop→main はmerge commit

### コミットメッセージ規約（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

**type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット（コード挙動への影響なし）
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト追加・修正
- `build`: ビルドシステム
- `ci`: CI/CD設定
- `chore`: その他（依存更新等）

**例**:
```
feat(chat): SSEによるリアルタイムメッセージ配信を実装

プロジェクト別のSSEエンドポイントを追加し、メッセージ送信時に
参加メンバーへリアルタイム配信する。

- SseHubクラスをlib/sse/hub.tsに追加
- ChatService.sendMessageでブロードキャスト
- chat.message.created/updated/deletedイベント定義

Closes #42
```

### Pull Requestプロセス

**PR作成前チェック**:
- [ ] 全テスト成功（`npm test`, `npm run test:e2e`）
- [ ] Lintエラーなし（`npm run lint`）
- [ ] 型チェック成功（`npm run typecheck`）
- [ ] コンフリクト解消済み

**PRテンプレート**:
```markdown
## 変更種別
- [ ] 新機能 (feat)
- [ ] バグ修正 (fix)
- [ ] リファクタリング (refactor)
- [ ] ドキュメント (docs)
- [ ] その他 (chore)

## 概要
[変更内容の簡潔な説明]

## 変更理由
[なぜこの変更が必要か]

## 変更内容
- [変更1]
- [変更2]

## テスト
- [ ] Unit Test追加
- [ ] E2E Test追加
- [ ] 手動テスト実施

テスト結果: [説明]

## 関連Issue
Closes #[番号]

## レビューポイント
[特に確認してほしい点]
```

**レビュープロセス**:
1. セルフレビュー
2. 自動テスト実行（CI）
3. レビュアー割当
4. レビュー指摘対応
5. 承認後にマージ

**PRサイズ目安**:
- 小PR（100行以下）: 推奨
- 中PR（100-300行）: 許容
- 大PR（300行超）: 分割を検討

## テスト戦略

### テスト実装の必須条件

本プロジェクトでは、品質担保のため **Unit Test（Vitest）と E2E Test（Playwright）の実装を必須とする。** テストが未実装・未成功のPRはマージ不可。

#### Unit Test（Vitest）の実装【必須】

以下の対象について Unit Test の実装を必須とする。新規実装・修正時に対応する Unit Test を必ず作成すること。

- SQLラッパー
- Migration実行
- 全Repositoryクラス（User / Project / ProjectMember / Board / Chat / Todo / File / Calendar / Meeting / ProjectNote / Notification / ActivityLog）
- 全Serviceクラス（Auth / Project / Chat / Meeting / Schedule / FileStorage / Backup）
- 権限チェック・バリデーション・スケジュール重複判定・通知作成ロジック・アクティビティログ作成ロジック・マイルストーン進捗計算

**合格基準**:
- [ ] `npm test` で全件成功すること
- [ ] Repository/Service層のカバレッジ 80%以上を維持すること
- [ ] 正常系・異常系（権限エラー・バリデーションエラー・存在確認）を網羅すること

#### E2E Test（Playwright）の実装【必須】

主要ユーザーフローについて Playwright による E2E Test の実装を必須とする。機能追加時は該当フローの E2E Test を必ず作成すること。

対象フロー:
- 認証（ログイン・ログアウト・未ログインの保護）
- プロジェクト管理（作成・編集・メンバー追加/削除・アーカイブ）
- 掲示板（スレッド作成・編集・コメント・検索）
- チャット（送信・SSEリアルタイム受信・編集・削除）
- ToDo / Kanban（カラム作成・タスク作成・編集・移動・担当者/期限設定・完了）
- ファイル共有（アップロード・一覧・Lightbox閲覧・PDFプレビュー・削除）
- Markdownメモ（作成・編集・プレビュー・ピン留め・検索・削除）
- カレンダー（ToDo期限・マイルストーン・ミーティング表示・イベント作成/編集）
- ミーティング（作成・参加メンバー設定・予定重複警告・アジェンダ/議事録・関連付け）
- 通知（ToDo担当者・メンション・ミーティング参加者への通知・既読化）
- アクティビティログ（各操作の記録）
- バックアップ（作成・一覧表示・ダウンロード）

**合格基準**:
- [ ] `npm run test:e2e` で全件成功すること
- [ ] 主要フローのカバレッジ 100%を維持すること

### テストピラミッド

```
       /\
      /E2E\       少数（遅い・高コスト）
     /------\
    / Integ. \    中程度
   /----------\
  /   Unit    \  多数（高速・低コスト）
 /--------------\
```

**対象比率**:
- Unit Test: 70%
- Integration Test: 20%
- E2E Test: 10%

### Unit Test（Vitest）

**対象**: SQLラッパー・Migration・全Repository・全Service・権限チェック・バリデーション・スケジュール重複判定・通知作成ロジック・アクティビティログ作成ロジック・マイルストーン進捗計算

**カバレッジ目標**: Repository/Service層 80%以上

**構造（Given-When-Then）**:
```typescript
describe('ChatService', () => {
  describe('sendMessage', () => {
    it('有効なデータでメッセージを作成できる', async () => {
      // Given: セットアップ
      const chatService = new ChatService(mockChatRepo, mockSseHub, mockNotificationService);
      const input = { body: 'テストメッセージ' };

      // When: 実行
      const result = await chatService.sendMessage(actorId, projectId, input.body);

      // Then: 検証
      expect(result.id).toBeDefined();
      expect(result.body).toBe('テストメッセージ');
      expect(mockSseHub.broadcast).toHaveBeenCalledWith(projectId, expect.objectContaining({ type: 'chat.message.created' }));
    });

    it('プロジェクト非参加者はメッセージ送信時にForbiddenErrorを投げる', async () => {
      // Given
      const chatService = new ChatService(...);
      mockProjectMemberRepository.isMember.mockReturnValue(false);

      // When/Then
      await expect(chatService.sendMessage(nonMemberId, projectId, 'body')).rejects.toThrow(ForbiddenError);
    });
  });
});
```

**テスト命名**: `[対象]_[条件]_[期待結果]`
```typescript
it('findById_existingId_returnsThread', () => { });
it('findById_nonExistentId_returnsNull', () => { });
it('create_emptyTitle_throwsValidationError', () => { });
```

**モック原則**: 外部依存（DB・ファイルシステム・SSE）はモック化、業務ロジックは実体を使用。

### Integration Test（Vitest）

**対象**: 複数コンポーネントの連携。実際のSQLite（一時ファイル）を使用。

```typescript
describe('プロジェクトメンバー権限', () => {
  it('非参加者はプロジェクトデータにアクセスできない', async () => {
    // 実DBでプロジェクト・ユーザー作成
    const project = await projectService.createProject(ownerId, { name: 'P1' });
    await expect(boardService.listThreads(nonMemberId, project.id)).rejects.toThrow(ForbiddenError);
  });
});
```

### E2E Test（Playwright）

**対象**: 主要ユーザーフローの全体検証。`tests/e2e/*.spec.ts`。

```typescript
test('チャットメッセージがSSEでリアルタイム配信される', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // 両ブラウザで同プロジェクトのチャット画面を開く
  await pageA.goto('/projects/1/chat');
  await pageB.goto('/projects/1/chat');

  // Aがメッセージ送信
  await pageA.fill('input[name=message]', 'こんにちは');
  await pageA.click('button[type=submit]');

  // Bにリアルタイム表示される
  await expect(pageB.locator('text=こんにちは')).toBeVisible();
});
```

**カバレッジ目標**: 主要フロー100%（認証・プロジェクト管理・掲示板・チャット・ToDo・ファイル・メモ・カレンダー・ミーティング・通知・アクティビティ・バックアップ）

### 実行コマンド

| コマンド | 説明 |
|---------|------|
| `npm test` | Unit Test実行（Vitest） |
| `npm run test:e2e` | E2E Test実行（Playwright） |
| `npm run lint` | Lint実行（ESLint） |
| `npm run typecheck` | 型チェック実行（tsc --noEmit） |
| `npm run build` | ビルド |

## コードレビュー基準

### レビューポイント

**機能性**:
- [ ] 要件を満たしているか
- [ ] エッジケースが考慮されているか
- [ ] エラーハンドリングが適切か

**可読性**:
- [ ] 命名が明確か
- [ ] コメントが適切か
- [ ] 複雑なロジックに説明があるか

**保守性**:
- [ ] 重複コードがないか
- [ ] 責務が分離されているか
- [ ] 変更の影響範囲が限定的か

**パフォーマンス**:
- [ ] 不要な計算がないか
- [ ] N+1クエリになっていないか
- [ ] 一覧取得がページネーションされているか

**セキュリティ**:
- [ ] 入力バリデーションが適切か
- [ ] SQLがパラメータバインドされているか
- [ ] 権限チェックが実装されているか
- [ ] 機密情報のハードコードがないか
- [ ] Markdownがサニタイズされているか

### レビューコメントの書き方

**建設的フィードバック**:
```markdown
// ✅ 良い例
この実装だとメンバー数増加時にN+1クエリになります。
JOINで一括取得するのはいかがでしょうか？

// ❌ 悪い例
この書き方は良くないです。
```

**優先度の明示**:
- `[必須]`: 修正必須（セキュリティ・バグ等）
- `[推奨]`: 修正推奨
- `[提案]`: 検討提案
- `[質問]`: 意図の確認

## 開発環境セットアップ

### 必須ツール

| ツール | バージョン | インストール方法 |
|--------|-----------|-----------------|
| Node.js | v24.11.0 | 公式インストーラ/nvm |
| npm | 11.x | Node.jsにバンドル |
| devcontainer | - | VS Code拡張（開発環境統一） |

### セットアップ手順

```bash
# 1. リポジトリクローン
git clone [URL]
cd [project-name]

# 2. 依存関係インストール
npm install

# 3. 環境変数設定
cp .env.example .env
# .env を編集（SQLITE_PATH等）

# 4. DB初期化（Migration実行）
npm run migrate

# 5. 開発サーバ起動
npm run dev
```

### 品質自動化

**Pre-commit（Husky + lint-staged）**: コミット前にLint・フォーマット・型チェックを自動実行

```json
// package.json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "migrate": "tsx lib/db/run-migrations.ts",
    "dev": "next dev",
    "build": "next build"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

**CI（GitHub Actions）**: PR作成時にLint・型チェック・Unit Test・ビルドを自動実行

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

**効果**: 欠陥コードの混入防止・早期発見による修正コスト削減・CIによる品質担保。

## チェックリスト

### 実装完了前
- [ ] 命名が明確で一貫している
- [ ] 関数が単一責務
- [ ] マジックナンバーがない
- [ ] 型注釈が適切
- [ ] エラーハンドリングが実装されている

### セキュリティ
- [ ] 入力バリデーション実装
- [ ] 機密情報のハードコードなし
- [ ] SQLパラメータバインド
- [ ] 権限チェック実装
- [ ] Markdownサニタイズ

### パフォーマンス
- [ ] 適切なデータ構造
- [ ] N+1クエリ回避
- [ ] 一覧のページネーション

### テスト【必須】
- [ ] Unit Test（Vitest）作成
- [ ] E2E Test（Playwright）作成
- [ ] `npm test` 全件成功
- [ ] `npm run test:e2e` 全件成功
- [ ] エッジケース網羅

### ツール
- [ ] Lintエラーなし
- [ ] 型チェック成功
- [ ] フォーマット統一
