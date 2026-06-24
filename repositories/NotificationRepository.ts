import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { Notification, NotificationType } from '@/lib/types';

export interface CreateNotificationInput {
  userId: number;
  projectId: number | null;
  type: NotificationType;
  title: string;
  body: string | null;
}

interface NotificationRow {
  id: number;
  user_id: number;
  project_id: number | null;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * notificationsテーブルへのデータアクセスを担うRepository。
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

  /** ユーザーの未読通知一覧（作成日時降順・ページネーション） */
  findUnreadByUser(
    userId: number,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Paginated<Notification> {
    const offset = (page - 1) * pageSize;
    const items = this.db.query<NotificationRow>(
      `SELECT * FROM notifications
       WHERE user_id = @userId AND read_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT @pageSize OFFSET @offset`,
      { userId, pageSize, offset }
    );
    const total = this.countUnreadByUser(userId);
    return { items: items.map(mapNotification), total };
  }

  countUnreadByUser(userId: number): number {
    const row = this.db.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = @userId AND read_at IS NULL',
      { userId }
    );
    return row?.count ?? 0;
  }

  /** 通知を既読にする（本人所有の未読通知のみ） */
  markRead(id: number, userId: number): boolean {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `UPDATE notifications SET read_at = @now
       WHERE id = @id AND user_id = @userId AND read_at IS NULL`,
      { now, id, userId }
    );
    return result.changes > 0;
  }
}
