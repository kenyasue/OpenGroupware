/**
 * 通知とアクティビティログの生成器。アクティビティログは実IDを参照する。
 */
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { chance, pick, randInt, type Rng } from './rng';
import { ACTIVITY_ACTIONS, NOTIF_TEMPLATES } from './pools';
import { type ActivityContext, insert, now } from './helpers';

export function seedNotifications(
  db: SqliteDatabase,
  rng: Rng,
  projectId: number,
  memberIds: number[]
): void {
  const count = randInt(rng, 3, 5);
  for (let i = 0; i < count; i++) {
    const t = pick(rng, NOTIF_TEMPLATES);
    insert(
      db,
      `INSERT INTO notifications (user_id, project_id, type, title, body, read_at, created_at)
       VALUES (@userId, @projectId, @type, @title, @body, @readAt, @createdAt)`,
      {
        userId: pick(rng, memberIds),
        projectId,
        type: t.type,
        title: t.title,
        body: t.body,
        readAt: chance(rng, 0.3) ? now() : null,
        createdAt: now(),
      }
    );
  }
}

export function seedActivityLogs(
  db: SqliteDatabase,
  rng: Rng,
  projectId: number,
  memberIds: number[],
  ctx: ActivityContext
): void {
  const targetsByType: Record<string, number[]> = {
    thread: ctx.threadIds,
    comment: ctx.commentIds,
    todo: ctx.todoIds,
    file: ctx.fileIds,
    meeting: ctx.meetingIds,
    note: ctx.noteIds,
    milestone: ctx.milestoneIds,
  };
  const count = randInt(rng, 8, 12);
  for (let i = 0; i < count; i++) {
    const a = pick(rng, ACTIVITY_ACTIONS);
    const pool = targetsByType[a.targetType] ?? [];
    if (pool.length === 0) continue;
    insert(
      db,
      `INSERT INTO activity_logs (project_id, actor_id, action, target_type, target_id, metadata_json, created_at)
       VALUES (@projectId, @actorId, @action, @targetType, @targetId, NULL, @createdAt)`,
      {
        projectId,
        actorId: pick(rng, memberIds),
        action: a.action,
        targetType: a.targetType,
        targetId: pick(rng, pool),
        createdAt: now(),
      }
    );
  }
}
