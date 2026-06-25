import type { SqliteDatabase } from '@/lib/db/sqlite';
import type {
  Attachment,
  AttachmentTargetType,
  AttachmentView,
} from '@/lib/types';

interface AttachmentRow {
  id: number;
  project_id: number;
  file_id: number;
  target_type: string;
  target_id: number;
  created_at: string;
  deleted_at: string | null;
}

interface AttachmentViewRow {
  id: number;
  file_id: number;
  target_type: string;
  target_id: number;
  original_name: string;
  mime_type: string;
  size: number;
}

function mapAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    projectId: row.project_id,
    fileId: row.file_id,
    targetType: row.target_type as AttachmentTargetType,
    targetId: row.target_id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function mapView(row: AttachmentViewRow): AttachmentView {
  return {
    id: row.id,
    fileId: row.file_id,
    targetType: row.target_type as AttachmentTargetType,
    targetId: row.target_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
  };
}

export interface CreateAttachmentInput {
  projectId: number;
  fileId: number;
  targetType: AttachmentTargetType;
  targetId: number;
}

/**
 * attachments テーブルのCRUDを担うRepository。
 * file_assets とJOINして表示用ビューを返す。
 */
export class AttachmentRepository {
  constructor(private readonly db: SqliteDatabase) {}

  create(input: CreateAttachmentInput): Attachment {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO attachments (project_id, file_id, target_type, target_id, created_at, deleted_at)
       VALUES (@projectId, @fileId, @targetType, @targetId, @createdAt, NULL)`,
      {
        projectId: input.projectId,
        fileId: input.fileId,
        targetType: input.targetType,
        targetId: input.targetId,
        createdAt: now,
      }
    );
    const created = this.findById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create attachment');
    return created;
  }

  findById(id: number): Attachment | null {
    const row = this.db.get<AttachmentRow>(
      'SELECT * FROM attachments WHERE id = @id AND deleted_at IS NULL',
      { id }
    );
    return row ? mapAttachment(row) : null;
  }

  findByTarget(
    targetType: AttachmentTargetType,
    targetId: number
  ): Attachment[] {
    const rows = this.db.query<AttachmentRow>(
      `SELECT * FROM attachments
       WHERE target_type = @targetType AND target_id = @targetId AND deleted_at IS NULL
       ORDER BY id ASC`,
      { targetType, targetId }
    );
    return rows.map(mapAttachment);
  }

  /** 複数ターゲットの添付ビューを一括取得(N+1回避)。 */
  findViewsByTargets(
    targetType: AttachmentTargetType,
    targetIds: number[]
  ): AttachmentView[] {
    if (targetIds.length === 0) return [];
    const placeholders = targetIds.map(() => '?').join(',');
    const rows = this.db.query<AttachmentViewRow>(
      `SELECT a.id AS id, a.file_id AS file_id, a.target_type AS target_type,
              a.target_id AS target_id, f.original_name AS original_name,
              f.mime_type AS mime_type, f.size AS size
         FROM attachments a
         JOIN file_assets f ON f.id = a.file_id
        WHERE a.target_type = ? AND a.deleted_at IS NULL
          AND f.deleted_at IS NULL
          AND a.target_id IN (${placeholders})
        ORDER BY a.target_id ASC, a.id ASC`,
      [targetType, ...targetIds]
    );
    return rows.map(mapView);
  }

  /** 対象の添付を論理削除(メッセージ/スレッド/コメント削除時のクリーンアップ)。 */
  deleteByTarget(targetType: AttachmentTargetType, targetId: number): boolean {
    const result = this.db.execute(
      'UPDATE attachments SET deleted_at = @now WHERE target_type = @targetType AND target_id = @targetId AND deleted_at IS NULL',
      { now: new Date().toISOString(), targetType, targetId }
    );
    return result.changes > 0;
  }
}
