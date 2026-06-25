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
 * 投入内容: 管理者1名 + 一般ユーザー5名、プロジェクト3件、各プロジェクトに
 * 掲示板/チャット/ToDo/メモ/ファイル/カレンダー/マイルストーン/ミーティング/
 * 通知/アクティビティログを網羅。
 */
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcrypt';
import { SqliteDatabase } from '../lib/db/sqlite';
import { Migrator } from '../lib/db/migrator';

const BCRYPT_ROUNDS = 10;
const now = () => new Date().toISOString();
const daysFromNow = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString();
};
const dayStr = (d: number) => daysFromNow(d).slice(0, 10);

interface UserSeed {
  name: string;
  email: string;
  password: string;
  role: 'system_admin' | 'member';
  status: 'active' | 'inactive';
}

const USERS: UserSeed[] = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'system_admin',
    status: 'active',
  },
  {
    name: 'Alice Tanaka',
    email: 'alice@example.com',
    password: 'password',
    role: 'member',
    status: 'active',
  },
  {
    name: 'Bob Sato',
    email: 'bob@example.com',
    password: 'password',
    role: 'member',
    status: 'active',
  },
  {
    name: 'Carol Yamada',
    email: 'carol@example.com',
    password: 'password',
    role: 'member',
    status: 'active',
  },
  {
    name: 'Dave Suzuki',
    email: 'dave@example.com',
    password: 'password',
    role: 'member',
    status: 'active',
  },
  {
    name: 'Eve Mori (inactive)',
    email: 'eve@example.com',
    password: 'password',
    role: 'member',
    status: 'inactive',
  },
];

// 1x1 透明PNG(ファイル共有デモ用)
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function insert(
  db: SqliteDatabase,
  sql: string,
  params: Record<string, unknown> = {}
): number {
  return Number(db.execute(sql, params).lastInsertRowid);
}

function resetStorage(dbPath: string, uploadsDir: string): void {
  for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  if (fs.existsSync(uploadsDir)) fs.rmSync(uploadsDir, { recursive: true });
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function seedUsers(db: SqliteDatabase): Map<string, number> {
  const ids = new Map<string, number>();
  for (const u of USERS) {
    const id = insert(
      db,
      `INSERT INTO users (name, email, password_hash, avatar_url, role, status, created_at, updated_at)
       VALUES (@name, @email, @passwordHash, NULL, @role, @status, @createdAt, @updatedAt)`,
      {
        name: u.name,
        email: u.email,
        passwordHash: bcrypt.hashSync(u.password, BCRYPT_ROUNDS),
        role: u.role,
        status: u.status,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    ids.set(u.email, id);
  }
  return ids;
}

interface ProjectSeed {
  name: string;
  description: string;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  owner: string; // email
  members: { email: string; role: 'admin' | 'member' | 'guest' }[];
}

const PROJECTS: ProjectSeed[] = [
  {
    name: 'Website Redesign',
    description: 'コーポレートサイトの全面リニューアルプロジェクト',
    status: 'active',
    owner: 'alice@example.com',
    members: [
      { email: 'bob@example.com', role: 'member' },
      { email: 'carol@example.com', role: 'member' },
    ],
  },
  {
    name: 'Mobile App v2',
    description: 'iOS/Androidアプリの次期メジャーバージョン開発',
    status: 'active',
    owner: 'bob@example.com',
    members: [
      { email: 'alice@example.com', role: 'member' },
      { email: 'dave@example.com', role: 'member' },
    ],
  },
  {
    name: 'Marketing Campaign Q4',
    description: '第4四半期マーケティングキャンペーンの企画・実行',
    status: 'on_hold',
    owner: 'carol@example.com',
    members: [
      { email: 'alice@example.com', role: 'member' },
      { email: 'bob@example.com', role: 'member' },
      { email: 'dave@example.com', role: 'guest' },
    ],
  },
];

function addMember(
  db: SqliteDatabase,
  projectId: number,
  userId: number,
  role: string
): void {
  insert(
    db,
    `INSERT INTO project_members (project_id, user_id, role, joined_at)
     VALUES (@projectId, @userId, @role, @joinedAt)`,
    { projectId, userId, role, joinedAt: now() }
  );
}

function seedBoard(
  db: SqliteDatabase,
  projectId: number,
  authorIds: number[]
): void {
  const threads = [
    {
      title: 'デザイン方針について',
      body: '# デザイン方針\n\n- シンプルさを重視\n- モバイルファースト\n\nご意見ください。',
      category: 'decision',
      pinned: 1,
      important: 1,
    },
    {
      title: '週次進捗報告',
      body: '今週の進捗を共有します。\n\n| タスク | 状態 |\n|---|---|\n| トップ画面 | 完了 |\n| About画面 | 進行中 |',
      category: 'minutes',
      pinned: 0,
      important: 0,
    },
    {
      title: 'FAQ: ログインできない',
      body: 'ログインできない場合のトラブルシューティングです。',
      category: 'trouble',
      pinned: 0,
      important: 0,
    },
  ];
  for (const t of threads) {
    const author = authorIds[0];
    const threadId = insert(
      db,
      `INSERT INTO board_threads (project_id, title, body_md, author_id, category, is_pinned, is_important, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @bodyMd, @authorId, @category, @isPinned, @isImportant, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        title: t.title,
        bodyMd: t.body,
        authorId: author,
        category: t.category,
        isPinned: t.pinned,
        isImportant: t.important,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    // コメント
    const commenter = authorIds[1] ?? author;
    insert(
      db,
      `INSERT INTO board_comments (thread_id, author_id, body_md, created_at, updated_at, deleted_at)
       VALUES (@threadId, @authorId, @bodyMd, @createdAt, @updatedAt, NULL)`,
      {
        threadId,
        authorId: commenter,
        bodyMd: '確認しました。ありがとうございます！',
        createdAt: now(),
        updatedAt: now(),
      }
    );
  }
}

function seedChat(
  db: SqliteDatabase,
  projectId: number,
  authorIds: number[]
): void {
  const messages = [
    { author: 0, body: 'おはようございます！今日もよろしくお願いします。' },
    {
      author: 1,
      body: 'おつですー。 @alice@example.com ちょっと確認したいことあります',
    },
    { author: 0, body: '何でしょう？' },
    { author: 1, body: 'デザインのカラーパレット、これで確定で大丈夫ですか？' },
    { author: 0, body: '問題ないです！進めましょう :)' },
  ];
  for (const m of messages) {
    insert(
      db,
      `INSERT INTO chat_messages (project_id, author_id, body, created_at, updated_at, deleted_at)
       VALUES (@projectId, @authorId, @body, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        authorId: authorIds[m.author],
        body: m.body,
        createdAt: now(),
        updatedAt: now(),
      }
    );
  }
}

function seedTodos(
  db: SqliteDatabase,
  projectId: number,
  memberIds: number[],
  milestoneIds: number[]
): void {
  const columns = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
  const colIds: number[] = [];
  columns.forEach((name, idx) => {
    colIds.push(
      insert(
        db,
        `INSERT INTO todo_columns (project_id, name, order_index, created_at, updated_at)
         VALUES (@projectId, @name, @orderIndex, @createdAt, @updatedAt)`,
        { projectId, name, orderIndex: idx, createdAt: now(), updatedAt: now() }
      )
    );
  });

  const items = [
    {
      col: 0,
      title: 'アイデア募集: ヘッダー案',
      priority: 'low',
      assignee: null,
      due: null,
      milestone: null,
      completed: false,
    },
    {
      col: 1,
      title: 'トップ画面の実装',
      priority: 'high',
      assignee: 0,
      due: dayStr(2),
      milestone: 0,
      completed: false,
    },
    {
      col: 1,
      title: 'About画面の実装',
      priority: 'normal',
      assignee: 1,
      due: dayStr(5),
      milestone: 0,
      completed: false,
    },
    {
      col: 2,
      title: '問い合わせフォーム',
      priority: 'normal',
      assignee: 0,
      due: dayStr(7),
      milestone: 1,
      completed: false,
    },
    {
      col: 3,
      title: 'デザインレビュー',
      priority: 'high',
      assignee: 1,
      due: dayStr(1),
      milestone: 1,
      completed: false,
    },
    {
      col: 4,
      title: '要件定義',
      priority: 'normal',
      assignee: 0,
      due: dayStr(-3),
      milestone: 0,
      completed: true,
    },
    {
      col: 4,
      title: 'ワイヤフレーム',
      priority: 'normal',
      assignee: 1,
      due: dayStr(-1),
      milestone: 0,
      completed: true,
    },
  ];
  items.forEach((it, idx) => {
    const assigneeId = it.assignee === null ? null : memberIds[it.assignee];
    const milestoneId =
      it.milestone === null ? null : milestoneIds[it.milestone];
    insert(
      db,
      `INSERT INTO todo_items (project_id, column_id, title, description, assignee_id, creator_id, priority, start_date, due_date, completed_at, order_index, milestone_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @columnId, @title, @description, @assigneeId, @creatorId, @priority, NULL, @dueDate, @completedAt, @orderIndex, @milestoneId, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        columnId: colIds[it.col],
        title: it.title,
        description: 'デモ用タスクです。',
        assigneeId,
        creatorId: memberIds[0],
        priority: it.priority,
        dueDate: it.due,
        completedAt: it.completed ? now() : null,
        orderIndex: idx,
        milestoneId,
        createdAt: now(),
        updatedAt: now(),
      }
    );
  });
}

function seedNotes(
  db: SqliteDatabase,
  projectId: number,
  authorIds: number[]
): void {
  const notes = [
    {
      title: 'ミーティングメモ',
      body: '# ミーティングメモ\n\n## 決定事項\n- カラーテーマ: 青\n- リリース: 来月\n\n## 宿題\n- [ ] デザイン作成\n- [ ] レビュー',
      tags: 'meeting,notes',
      pinned: 1,
    },
    {
      title: '技術メモ',
      body: '## 技術スタック\n\n- Next.js 15\n- SQLite\n- Tailwind CSS\n\n```ts\nconst x = 1;\n```',
      tags: 'tech',
      pinned: 0,
    },
    {
      title: 'アイデア',
      body: '面白い機能のアイデアをメモしておく場所。',
      tags: null,
      pinned: 0,
    },
  ];
  for (const n of notes) {
    insert(
      db,
      `INSERT INTO project_notes (project_id, title, body_md, tags, is_pinned, created_by_id, updated_by_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @bodyMd, @tags, @isPinned, @createdById, @updatedById, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        title: n.title,
        bodyMd: n.body,
        tags: n.tags,
        isPinned: n.pinned,
        createdById: authorIds[0],
        updatedById: authorIds[0],
        createdAt: now(),
        updatedAt: now(),
      }
    );
  }
}

function seedFiles(
  db: SqliteDatabase,
  projectId: number,
  uploaderId: number,
  uploadsDir: string
): void {
  const dir = path.join(uploadsDir, String(projectId));
  fs.mkdirSync(dir, { recursive: true });

  // 画像ファイル
  const imgName = `${crypto.randomUUID()}.png`;
  const imgPath = path.join(dir, imgName);
  fs.writeFileSync(imgPath, PNG_BYTES);
  insert(
    db,
    `INSERT INTO file_assets (project_id, uploader_id, filename, original_name, mime_type, size, path, created_at, deleted_at)
     VALUES (@projectId, @uploaderId, @filename, @originalName, @mimeType, @size, @path, @createdAt, NULL)`,
    {
      projectId,
      uploaderId,
      filename: imgName,
      originalName: 'sample-diagram.png',
      mimeType: 'image/png',
      size: PNG_BYTES.length,
      path: imgPath,
      createdAt: now(),
    }
  );

  // テキストファイル
  const txtName = `${crypto.randomUUID()}.txt`;
  const txtPath = path.join(dir, txtName);
  const txtContent =
    'これはデモ用テキストファイルです。\nシードスクリプトによって生成されました。';
  fs.writeFileSync(txtPath, txtContent, 'utf-8');
  insert(
    db,
    `INSERT INTO file_assets (project_id, uploader_id, filename, original_name, mime_type, size, path, created_at, deleted_at)
     VALUES (@projectId, @uploaderId, @filename, @originalName, @mimeType, @size, @path, @createdAt, NULL)`,
    {
      projectId,
      uploaderId,
      filename: txtName,
      originalName: 'spec-notes.txt',
      mimeType: 'text/plain',
      size: Buffer.byteLength(txtContent),
      path: txtPath,
      createdAt: now(),
    }
  );
}

function seedMilestones(db: SqliteDatabase, projectId: number): number[] {
  const ms = [
    { title: 'M1: デザイン完了', due: dayStr(7) },
    { title: 'M2: 実装完了', due: dayStr(21) },
  ];
  const ids: number[] = [];
  for (const m of ms) {
    ids.push(
      insert(
        db,
        `INSERT INTO milestones (project_id, title, description, due_date, status, created_at, updated_at, deleted_at)
         VALUES (@projectId, @title, @description, @dueDate, 'open', @createdAt, @updatedAt, NULL)`,
        {
          projectId,
          title: m.title,
          description: 'マイルストーンです。',
          dueDate: m.due,
          createdAt: now(),
          updatedAt: now(),
        }
      )
    );
  }
  return ids;
}

function seedCalendar(
  db: SqliteDatabase,
  projectId: number,
  creatorId: number
): void {
  const events = [
    {
      title: '定例ミーティング',
      type: 'meeting',
      start: daysFromNow(1),
      end: daysFromNow(1),
    },
    {
      title: 'デザインレビュー',
      type: 'reminder',
      start: daysFromNow(3),
      end: null,
    },
    { title: 'リリース締切', type: 'deadline', start: dayStr(14), end: null },
  ];
  for (const e of events) {
    insert(
      db,
      `INSERT INTO calendar_events (project_id, title, description, type, start_at, end_at, created_by_id, related_todo_id, related_milestone_id, related_meeting_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @description, @type, @startAt, @endAt, @createdById, NULL, NULL, NULL, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        title: e.title,
        description: 'カレンダーイベントです。',
        type: e.type,
        startAt: e.start,
        endAt: e.end,
        createdById: creatorId,
        createdAt: now(),
        updatedAt: now(),
      }
    );
  }
}

function seedMeetings(
  db: SqliteDatabase,
  projectId: number,
  creatorId: number,
  memberIds: number[]
): void {
  const meetingId = insert(
    db,
    `INSERT INTO meetings (project_id, title, description, location, meeting_url, start_at, end_at, agenda_md, minutes_md, created_by_id, created_at, updated_at, deleted_at)
     VALUES (@projectId, @title, @description, @location, @meetingUrl, @startAt, @endAt, @agendaMd, @minutesMd, @createdById, @createdAt, @updatedAt, NULL)`,
    {
      projectId,
      title: '週次定例ミーティング',
      description: '進捗確認と課題共有',
      location: '会議室A / オンライン',
      meetingUrl: 'https://meet.example.com/abc-defg-hij',
      startAt: daysFromNow(2),
      endAt: daysFromNow(2),
      agendaMd: '# アジェンダ\n\n1. 進捗共有\n2. ブロッカー確認\n3. 次週の計画',
      minutesMd: '# 議事録\n\n- トップ画面は完了\n- About画面は来週完了予定',
      createdById: creatorId,
      createdAt: now(),
      updatedAt: now(),
    }
  );
  for (const uid of memberIds) {
    insert(
      db,
      `INSERT INTO meeting_members (meeting_id, user_id, status) VALUES (@meetingId, @userId, 'invited')`,
      { meetingId, userId: uid }
    );
  }
}

function seedNotifications(
  db: SqliteDatabase,
  projectId: number,
  memberIds: number[]
): void {
  const notifs = [
    {
      user: 0,
      type: 'mention',
      title: 'メンションされました',
      body: 'チャットでメンションされました',
    },
    {
      user: 1,
      type: 'todo_assigned',
      title: 'ToDoが割り当てられました',
      body: 'トップ画面の実装',
    },
    {
      user: 0,
      type: 'meeting_invited',
      title: 'ミーティングに招待されました',
      body: '週次定例ミーティング',
    },
  ];
  for (const n of notifs) {
    insert(
      db,
      `INSERT INTO notifications (user_id, project_id, type, title, body, read_at, created_at)
       VALUES (@userId, @projectId, @type, @title, @body, NULL, @createdAt)`,
      {
        userId: memberIds[n.user],
        projectId,
        type: n.type,
        title: n.title,
        body: n.body,
        createdAt: now(),
      }
    );
  }
}

function seedActivityLogs(
  db: SqliteDatabase,
  projectId: number,
  actorIds: number[]
): void {
  const logs = [
    { actor: 0, action: 'board_posted', targetType: 'thread', targetId: 1 },
    { actor: 1, action: 'comment_added', targetType: 'comment', targetId: 1 },
    { actor: 0, action: 'todo_created', targetType: 'todo', targetId: 1 },
    { actor: 1, action: 'todo_completed', targetType: 'todo', targetId: 6 },
    { actor: 0, action: 'file_uploaded', targetType: 'file', targetId: 1 },
    { actor: 0, action: 'meeting_created', targetType: 'meeting', targetId: 1 },
    { actor: 1, action: 'note_updated', targetType: 'note', targetId: 1 },
    {
      actor: 0,
      action: 'milestone_updated',
      targetType: 'milestone',
      targetId: 1,
    },
  ];
  for (const l of logs) {
    insert(
      db,
      `INSERT INTO activity_logs (project_id, actor_id, action, target_type, target_id, metadata_json, created_at)
       VALUES (@projectId, @actorId, @action, @targetType, @targetId, NULL, @createdAt)`,
      {
        projectId,
        actorId: actorIds[l.actor],
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        createdAt: now(),
      }
    );
  }
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

  console.log('Seeding users...');
  const userIds = seedUsers(db);

  let projectCount = 0;
  for (const p of PROJECTS) {
    const ownerId = userIds.get(p.owner)!;
    const projectId = insert(
      db,
      `INSERT INTO projects (name, description, status, owner_id, created_at, updated_at)
       VALUES (@name, @description, @status, @ownerId, @createdAt, @updatedAt)`,
      {
        name: p.name,
        description: p.description,
        status: p.status,
        ownerId,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    addMember(db, projectId, ownerId, 'admin');
    const memberIds = [ownerId];
    for (const m of p.members) {
      const uid = userIds.get(m.email)!;
      addMember(db, projectId, uid, m.role);
      if (!memberIds.includes(uid)) memberIds.push(uid);
    }

    const milestoneIds = seedMilestones(db, projectId);
    seedBoard(db, projectId, memberIds);
    seedChat(db, projectId, memberIds);
    seedTodos(db, projectId, memberIds, milestoneIds);
    seedNotes(db, projectId, memberIds);
    seedFiles(db, projectId, ownerId, uploadsDir);
    seedCalendar(db, projectId, ownerId);
    seedMeetings(db, projectId, ownerId, memberIds);
    seedNotifications(db, projectId, memberIds);
    seedActivityLogs(db, projectId, memberIds);
    projectCount++;
  }

  db.close();

  console.log('\n=== Seed complete ===');
  console.log(`Users: ${USERS.length} | Projects: ${projectCount}`);
  console.log('\nLogin credentials:');
  console.log('  Admin:    admin@example.com / admin123   (system_admin)');
  console.log('  Users:    alice / bob / carol / dave @example.com / password');
  console.log('  Inactive: eve@example.com / password     (ログイン不可)');
  console.log('\nStart the app with:  npm run dev   ->  http://localhost:3000');
}

main();
