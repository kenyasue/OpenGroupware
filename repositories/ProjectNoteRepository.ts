import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { ProjectNote } from '@/lib/types';

const DEFAULT_PAGE_SIZE = 20;

export interface Paginated<T> {
  items: T[];
  total: number;
}

interface ProjectNoteRow {
  id: number;
  project_id: number;
  title: string;
  body_md: string;
  tags: string | null;
  is_pinned: number;
  created_by_id: number;
  updated_by_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapNote(row: ProjectNoteRow): ProjectNote {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    bodyMd: row.body_md,
    tags: row.tags,
    isPinned: row.is_pinned,
    createdById: row.created_by_id,
    updatedById: row.updated_by_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface CreateNoteInput {
  projectId: number;
  title: string;
  bodyMd: string;
  tags: string | null;
  createdById: number;
}

export interface UpdateNoteInput {
  title?: string;
  bodyMd?: string;
  tags?: string | null;
  isPinned?: number;
  updatedById: number;
}

export interface ListNotesOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

export class ProjectNoteRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findNotes(
    projectId: number,
    opts: ListNotesOptions = {}
  ): Paginated<ProjectNote> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * pageSize;
    const search = opts.search?.trim();
    const orderClause =
      'ORDER BY is_pinned DESC, updated_at DESC, id DESC LIMIT @pageSize OFFSET @offset';

    if (search) {
      const like = `%${search}%`;
      const items = this.db.query<ProjectNoteRow>(
        `SELECT * FROM project_notes
         WHERE project_id = @projectId AND deleted_at IS NULL
           AND (title LIKE @like OR body_md LIKE @like OR tags LIKE @like)
         ${orderClause}`,
        { projectId, like, pageSize, offset }
      );
      const total = this.db.get<{ count: number }>(
        `SELECT COUNT(*) AS count FROM project_notes
         WHERE project_id = @projectId AND deleted_at IS NULL
           AND (title LIKE @like OR body_md LIKE @like OR tags LIKE @like)`,
        { projectId, like }
      );
      return { items: items.map(mapNote), total: total?.count ?? 0 };
    }

    const items = this.db.query<ProjectNoteRow>(
      `SELECT * FROM project_notes
       WHERE project_id = @projectId AND deleted_at IS NULL
       ${orderClause}`,
      { projectId, pageSize, offset }
    );
    const total = this.db.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM project_notes WHERE project_id = @projectId AND deleted_at IS NULL',
      { projectId }
    );
    return { items: items.map(mapNote), total: total?.count ?? 0 };
  }

  findNoteById(id: number): ProjectNote | null {
    const row = this.db.get<ProjectNoteRow>(
      'SELECT * FROM project_notes WHERE id = @id AND deleted_at IS NULL',
      { id }
    );
    return row ? mapNote(row) : null;
  }

  create(input: CreateNoteInput): ProjectNote {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO project_notes (project_id, title, body_md, tags, is_pinned, created_by_id, updated_by_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @bodyMd, @tags, 0, @createdById, @updatedById, @createdAt, @updatedAt, NULL)`,
      {
        projectId: input.projectId,
        title: input.title,
        bodyMd: input.bodyMd,
        tags: input.tags,
        createdById: input.createdById,
        updatedById: input.createdById,
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findNoteById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create note');
    return created;
  }

  update(id: number, input: UpdateNoteInput): ProjectNote | null {
    const fields: string[] = [
      'updated_at = @updatedAt',
      'updated_by_id = @updatedById',
    ];
    const params: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedById: input.updatedById,
      id,
    };
    if (input.title !== undefined) {
      fields.push('title = @title');
      params.title = input.title;
    }
    if (input.bodyMd !== undefined) {
      fields.push('body_md = @bodyMd');
      params.bodyMd = input.bodyMd;
    }
    if (input.tags !== undefined) {
      fields.push('tags = @tags');
      params.tags = input.tags;
    }
    if (input.isPinned !== undefined) {
      fields.push('is_pinned = @isPinned');
      params.isPinned = input.isPinned;
    }
    this.db.execute(
      `UPDATE project_notes SET ${fields.join(', ')} WHERE id = @id AND deleted_at IS NULL`,
      params
    );
    return this.findNoteById(id);
  }

  delete(id: number): boolean {
    const result = this.db.execute(
      'UPDATE project_notes SET deleted_at = @now WHERE id = @id AND deleted_at IS NULL',
      { now: new Date().toISOString(), id }
    );
    return result.changes > 0;
  }
}
