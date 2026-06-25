import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { FileAsset } from '@/lib/types';

const DEFAULT_PAGE_SIZE = 20;

export interface Paginated<T> {
  items: T[];
  total: number;
}

interface FileAssetRow {
  id: number;
  project_id: number;
  uploader_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  created_at: string;
  deleted_at: string | null;
}

function mapFile(row: FileAssetRow): FileAsset {
  return {
    id: row.id,
    projectId: row.project_id,
    uploaderId: row.uploader_id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    path: row.path,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

export interface CreateFileInput {
  projectId: number;
  uploaderId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export class FileRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findFilesByProject(
    projectId: number,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Paginated<FileAsset> {
    const offset = (page - 1) * pageSize;
    const items = this.db.query<FileAssetRow>(
      `SELECT * FROM file_assets
       WHERE project_id = @projectId AND deleted_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT @pageSize OFFSET @offset`,
      { projectId, pageSize, offset }
    );
    const total = this.db.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM file_assets WHERE project_id = @projectId AND deleted_at IS NULL',
      { projectId }
    );
    return { items: items.map(mapFile), total: total?.count ?? 0 };
  }

  findFileById(id: number): FileAsset | null {
    const row = this.db.get<FileAssetRow>(
      'SELECT * FROM file_assets WHERE id = @id AND deleted_at IS NULL',
      { id }
    );
    return row ? mapFile(row) : null;
  }

  create(input: CreateFileInput): FileAsset {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO file_assets (project_id, uploader_id, filename, original_name, mime_type, size, path, created_at, deleted_at)
       VALUES (@projectId, @uploaderId, @filename, @originalName, @mimeType, @size, @path, @createdAt, NULL)`,
      {
        projectId: input.projectId,
        uploaderId: input.uploaderId,
        filename: input.filename,
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.size,
        path: input.path,
        createdAt: now,
      }
    );
    const created = this.findFileById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create file asset');
    return created;
  }

  delete(id: number): boolean {
    const result = this.db.execute(
      'UPDATE file_assets SET deleted_at = @now WHERE id = @id AND deleted_at IS NULL',
      { now: new Date().toISOString(), id }
    );
    return result.changes > 0;
  }
}
