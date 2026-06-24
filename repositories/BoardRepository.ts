import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { BoardCategory, BoardComment, BoardThread } from '@/lib/types';

const DEFAULT_PAGE_SIZE = 20;

export interface Paginated<T> {
  items: T[];
  total: number;
}

interface BoardThreadRow {
  id: number;
  project_id: number;
  title: string;
  body_md: string;
  author_id: number;
  category: string | null;
  is_pinned: number;
  is_important: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface BoardCommentRow {
  id: number;
  thread_id: number;
  author_id: number;
  body_md: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapThread(row: BoardThreadRow): BoardThread {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    bodyMd: row.body_md,
    authorId: row.author_id,
    category: row.category as BoardCategory | null,
    isPinned: row.is_pinned,
    isImportant: row.is_important,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapComment(row: BoardCommentRow): BoardComment {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    bodyMd: row.body_md,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface CreateThreadInput {
  projectId: number;
  title: string;
  bodyMd: string;
  authorId: number;
  category: BoardCategory | null;
}

export interface UpdateThreadInput {
  title?: string;
  bodyMd?: string;
  category?: BoardCategory | null;
  isPinned?: number;
  isImportant?: number;
}

export interface ListThreadsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

export class BoardRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findThreads(
    projectId: number,
    opts: ListThreadsOptions = {}
  ): Paginated<BoardThread> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * pageSize;
    const search = opts.search?.trim();

    if (search) {
      const like = `%${search}%`;
      const items = this.db.query<BoardThreadRow>(
        `SELECT * FROM board_threads
         WHERE project_id = @projectId AND deleted_at IS NULL
           AND (title LIKE @like OR body_md LIKE @like)
         ORDER BY is_pinned DESC, created_at DESC, id DESC
         LIMIT @pageSize OFFSET @offset`,
        { projectId, like, pageSize, offset }
      );
      const total = this.db.get<{ count: number }>(
        `SELECT COUNT(*) AS count FROM board_threads
         WHERE project_id = @projectId AND deleted_at IS NULL
           AND (title LIKE @like OR body_md LIKE @like)`,
        { projectId, like }
      );
      return { items: items.map(mapThread), total: total?.count ?? 0 };
    }

    const items = this.db.query<BoardThreadRow>(
      `SELECT * FROM board_threads
       WHERE project_id = @projectId AND deleted_at IS NULL
       ORDER BY is_pinned DESC, created_at DESC, id DESC
       LIMIT @pageSize OFFSET @offset`,
      { projectId, pageSize, offset }
    );
    const total = this.db.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM board_threads WHERE project_id = @projectId AND deleted_at IS NULL',
      { projectId }
    );
    return { items: items.map(mapThread), total: total?.count ?? 0 };
  }

  findThreadById(id: number): BoardThread | null {
    const row = this.db.get<BoardThreadRow>(
      'SELECT * FROM board_threads WHERE id = @id AND deleted_at IS NULL',
      { id }
    );
    return row ? mapThread(row) : null;
  }

  createThread(input: CreateThreadInput): BoardThread {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO board_threads (project_id, title, body_md, author_id, category, is_pinned, is_important, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @bodyMd, @authorId, @category, 0, 0, @createdAt, @updatedAt, NULL)`,
      {
        projectId: input.projectId,
        title: input.title,
        bodyMd: input.bodyMd,
        authorId: input.authorId,
        category: input.category,
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findThreadById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create thread');
    return created;
  }

  updateThread(id: number, input: UpdateThreadInput): BoardThread | null {
    const fields: string[] = ['updated_at = @updatedAt'];
    const params: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
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
    if (input.category !== undefined) {
      fields.push('category = @category');
      params.category = input.category;
    }
    if (input.isPinned !== undefined) {
      fields.push('is_pinned = @isPinned');
      params.isPinned = input.isPinned;
    }
    if (input.isImportant !== undefined) {
      fields.push('is_important = @isImportant');
      params.isImportant = input.isImportant;
    }
    this.db.execute(
      `UPDATE board_threads SET ${fields.join(', ')} WHERE id = @id AND deleted_at IS NULL`,
      params
    );
    return this.findThreadById(id);
  }

  deleteThread(id: number): boolean {
    const result = this.db.execute(
      'UPDATE board_threads SET deleted_at = @now WHERE id = @id AND deleted_at IS NULL',
      { now: new Date().toISOString(), id }
    );
    return result.changes > 0;
  }

  findCommentsByThread(
    threadId: number,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Paginated<BoardComment> {
    const offset = (page - 1) * pageSize;
    const items = this.db.query<BoardCommentRow>(
      `SELECT * FROM board_comments
       WHERE thread_id = @threadId AND deleted_at IS NULL
       ORDER BY created_at ASC, id ASC
       LIMIT @pageSize OFFSET @offset`,
      { threadId, pageSize, offset }
    );
    const total = this.db.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM board_comments WHERE thread_id = @threadId AND deleted_at IS NULL',
      { threadId }
    );
    return { items: items.map(mapComment), total: total?.count ?? 0 };
  }

  findCommentById(id: number): BoardComment | null {
    const row = this.db.get<BoardCommentRow>(
      'SELECT * FROM board_comments WHERE id = @id AND deleted_at IS NULL',
      { id }
    );
    return row ? mapComment(row) : null;
  }

  createComment(input: {
    threadId: number;
    authorId: number;
    bodyMd: string;
  }): BoardComment {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO board_comments (thread_id, author_id, body_md, created_at, updated_at, deleted_at)
       VALUES (@threadId, @authorId, @bodyMd, @createdAt, @updatedAt, NULL)`,
      {
        threadId: input.threadId,
        authorId: input.authorId,
        bodyMd: input.bodyMd,
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findCommentById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create comment');
    return created;
  }

  updateComment(id: number, bodyMd: string): BoardComment | null {
    this.db.execute(
      `UPDATE board_comments SET body_md = @bodyMd, updated_at = @updatedAt
       WHERE id = @id AND deleted_at IS NULL`,
      { bodyMd, updatedAt: new Date().toISOString(), id }
    );
    return this.findCommentById(id);
  }

  deleteComment(id: number): boolean {
    const result = this.db.execute(
      'UPDATE board_comments SET deleted_at = @now WHERE id = @id AND deleted_at IS NULL',
      { now: new Date().toISOString(), id }
    );
    return result.changes > 0;
  }
}
