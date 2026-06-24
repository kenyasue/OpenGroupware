import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { ActivityLog } from '@/lib/types';
import type { Paginated } from '@/repositories/NotificationRepository';

const DEFAULT_PAGE_SIZE = 20;

export interface CreateActivityLogInput {
  projectId: number;
  actorId: number;
  action: string;
  targetType: string;
  targetId: number | null;
  metadataJson: string | null;
}

interface ActivityLogRow {
  id: number;
  project_id: number;
  actor_id: number;
  action: string;
  target_type: string;
  target_id: number | null;
  metadata_json: string | null;
  created_at: string;
}

function mapActivityLog(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    projectId: row.project_id,
    actorId: row.actor_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadataJson: row.metadata_json,
    createdAt: row.created_at,
  };
}

/**
 * activity_logsテーブルへのデータアクセスを担うRepository。
 */
export class ActivityLogRepository {
  constructor(private readonly db: SqliteDatabase) {}

  create(input: CreateActivityLogInput): ActivityLog {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO activity_logs (project_id, actor_id, action, target_type, target_id, metadata_json, created_at)
       VALUES (@projectId, @actorId, @action, @targetType, @targetId, @metadataJson, @createdAt)`,
      {
        projectId: input.projectId,
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadataJson: input.metadataJson,
        createdAt: now,
      }
    );
    return {
      id: Number(result.lastInsertRowid),
      projectId: input.projectId,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadataJson: input.metadataJson,
      createdAt: now,
    };
  }

  /** プロジェクト別のアクティビティログ一覧（作成日時降順・ページネーション） */
  findByProject(
    projectId: number,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Paginated<ActivityLog> {
    const offset = (page - 1) * pageSize;
    const items = this.db.query<ActivityLogRow>(
      `SELECT * FROM activity_logs
       WHERE project_id = @projectId
       ORDER BY created_at DESC, id DESC
       LIMIT @pageSize OFFSET @offset`,
      { projectId, pageSize, offset }
    );
    const row = this.db.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM activity_logs WHERE project_id = @projectId',
      { projectId }
    );
    return { items: items.map(mapActivityLog), total: row?.count ?? 0 };
  }
}
