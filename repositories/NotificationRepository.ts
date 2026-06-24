import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { Notification, NotificationType } from '@/lib/types';

export interface CreateNotificationInput {
  userId: number;
  projectId: number | null;
  type: NotificationType;
  title: string;
  body: string | null;
}

/**
 * notificationsテーブルへのデータアクセスを担うRepository。
 * M4ではメンバー追加通知のために create のみ実装する。
 * 一覧取得・既読化は M5 で拡張する。
 */
export class NotificationRepository {
  constructor(private readonly db: SqliteDatabase) {}

  create(input: CreateNotificationInput): Notification {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO notifications (user_id, project_id, type, title, body, read_at, created_at)
       VALUES (@userId, @projectId, @type, @title, @body, NULL, @createdAt)`,
      {
        userId: input.userId,
        projectId: input.projectId,
        type: input.type,
        title: input.title,
        body: input.body,
        createdAt: now,
      }
    );
    return {
      id: Number(result.lastInsertRowid),
      userId: input.userId,
      projectId: input.projectId,
      type: input.type,
      title: input.title,
      body: input.body,
      readAt: null,
      createdAt: now,
    };
  }
}
