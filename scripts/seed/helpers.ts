/**
 * シード生成器間で共有する定数・時刻ヘルパ・挿入ヘルパ・カノニカルデータ。
 */
import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { ProjectMemberRole } from '@/lib/types';
import { type Rng } from './rng';

export const BCRYPT_ROUNDS = 10;
export const SEED = 0xc0ffee;
export const TARGET_USERS = 30;
export const TARGET_PROJECTS = 15;

// 実行日(UTC 0時)を基準にすることで、同日内の再実行で同一データになる。
const BASE_DATE = (() => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
})();
const BASE_TIME = BASE_DATE.toISOString();
export const now = (): string => BASE_TIME;
export const daysFromNow = (d: number): string => {
  const dt = new Date(BASE_DATE);
  dt.setUTCDate(dt.getUTCDate() + d);
  return dt.toISOString();
};
export const dayStr = (d: number): string => daysFromNow(d).slice(0, 10);

export const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

const BCRYPT_SALT_ALPHABET =
  './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function bcryptSalt(rng: Rng): string {
  let salt = '';
  for (let i = 0; i < 22; i++) {
    salt +=
      BCRYPT_SALT_ALPHABET[Math.floor(rng() * BCRYPT_SALT_ALPHABET.length)];
  }
  return `$2b$${BCRYPT_ROUNDS}$${salt}`;
}

export interface UserSeed {
  name: string;
  email: string;
  password: string;
  role: 'system_admin' | 'member';
  status: 'active' | 'inactive';
}

export interface ProjectSpec {
  name: string;
  description: string;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  ownerEmail: string | null;
  memberEmails: { email: string; role: 'admin' | 'member' | 'guest' }[];
}

export interface ActivityContext {
  threadIds: number[];
  commentIds: number[];
  todoIds: number[];
  fileIds: number[];
  meetingIds: number[];
  noteIds: number[];
  milestoneIds: number[];
}

export const CANONICAL_USERS: UserSeed[] = [
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

export const CANONICAL_PROJECTS: ProjectSpec[] = [
  {
    name: 'Website Redesign',
    description: 'コーポレートサイトの全面リニューアルプロジェクト',
    status: 'active',
    ownerEmail: 'alice@example.com',
    memberEmails: [
      { email: 'bob@example.com', role: 'member' },
      { email: 'carol@example.com', role: 'member' },
    ],
  },
  {
    name: 'Mobile App v2',
    description: 'iOS/Androidアプリの次期メジャーバージョン開発',
    status: 'active',
    ownerEmail: 'bob@example.com',
    memberEmails: [
      { email: 'alice@example.com', role: 'member' },
      { email: 'dave@example.com', role: 'member' },
    ],
  },
  {
    name: 'Marketing Campaign Q4',
    description: '第4四半期マーケティングキャンペーンの企画・実行',
    status: 'on_hold',
    ownerEmail: 'carol@example.com',
    memberEmails: [
      { email: 'alice@example.com', role: 'member' },
      { email: 'bob@example.com', role: 'member' },
      { email: 'dave@example.com', role: 'guest' },
    ],
  },
];

export function insert(
  db: SqliteDatabase,
  sql: string,
  params: Record<string, unknown> = {}
): number {
  return Number(db.execute(sql, params).lastInsertRowid);
}

export function addMember(
  db: SqliteDatabase,
  projectId: number,
  userId: number,
  role: ProjectMemberRole
): void {
  insert(
    db,
    `INSERT INTO project_members (project_id, user_id, role, joined_at)
     VALUES (@projectId, @userId, @role, @joinedAt)`,
    { projectId, userId, role, joinedAt: now() }
  );
}
