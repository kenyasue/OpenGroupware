import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { ChatMessage } from '@/lib/types';

const DEFAULT_PAGE_SIZE = 20;

export interface Paginated<T> {
  items: T[];
  total: number;
}

interface ChatMessageRow {
  id: number;
  project_id: number;
  author_id: number;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    projectId: row.project_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface ListMessagesOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

export class ChatRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findMessages(
    projectId: number,
    opts: ListMessagesOptions = {}
  ): Paginated<ChatMessage> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * pageSize;
    const search = opts.search?.trim();

    if (search) {
      const like = `%${search}%`;
      const items = this.db.query<ChatMessageRow>(
        `SELECT * FROM chat_messages
         WHERE project_id = @projectId AND deleted_at IS NULL
           AND body LIKE @like
         ORDER BY created_at DESC, id DESC
         LIMIT @pageSize OFFSET @offset`,
        { projectId, like, pageSize, offset }
      );
      const total = this.db.get<{ count: number }>(
        `SELECT COUNT(*) AS count FROM chat_messages
         WHERE project_id = @projectId AND deleted_at IS NULL AND body LIKE @like`,
        { projectId, like }
      );
      return { items: items.map(mapMessage), total: total?.count ?? 0 };
    }

    const items = this.db.query<ChatMessageRow>(
      `SELECT * FROM chat_messages
       WHERE project_id = @projectId AND deleted_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT @pageSize OFFSET @offset`,
      { projectId, pageSize, offset }
    );
    const total = this.db.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM chat_messages WHERE project_id = @projectId AND deleted_at IS NULL',
      { projectId }
    );
    return { items: items.map(mapMessage), total: total?.count ?? 0 };
  }

  findMessageById(id: number): ChatMessage | null {
    const row = this.db.get<ChatMessageRow>(
      'SELECT * FROM chat_messages WHERE id = @id AND deleted_at IS NULL',
      { id }
    );
    return row ? mapMessage(row) : null;
  }

  create(input: {
    projectId: number;
    authorId: number;
    body: string;
  }): ChatMessage {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO chat_messages (project_id, author_id, body, created_at, updated_at, deleted_at)
       VALUES (@projectId, @authorId, @body, @createdAt, @updatedAt, NULL)`,
      {
        projectId: input.projectId,
        authorId: input.authorId,
        body: input.body,
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findMessageById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create chat message');
    return created;
  }

  update(id: number, body: string): ChatMessage | null {
    this.db.execute(
      `UPDATE chat_messages SET body = @body, updated_at = @updatedAt
       WHERE id = @id AND deleted_at IS NULL`,
      { body, updatedAt: new Date().toISOString(), id }
    );
    return this.findMessageById(id);
  }

  delete(id: number): boolean {
    const result = this.db.execute(
      'UPDATE chat_messages SET deleted_at = @now WHERE id = @id AND deleted_at IS NULL',
      { now: new Date().toISOString(), id }
    );
    return result.changes > 0;
  }
}
