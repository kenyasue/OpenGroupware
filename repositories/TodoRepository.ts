import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { TodoColumn, TodoItem, TodoPriority } from '@/lib/types';

interface TodoColumnRow {
  id: number;
  project_id: number;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface TodoItemRow {
  id: number;
  project_id: number;
  column_id: number;
  title: string;
  description: string | null;
  assignee_id: number | null;
  creator_id: number;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  order_index: number;
  milestone_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapColumn(row: TodoColumnRow): TodoColumn {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row: TodoItemRow): TodoItem {
  return {
    id: row.id,
    projectId: row.project_id,
    columnId: row.column_id,
    title: row.title,
    description: row.description,
    assigneeId: row.assignee_id,
    creatorId: row.creator_id,
    priority: row.priority as TodoPriority,
    startDate: row.start_date,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    orderIndex: row.order_index,
    milestoneId: row.milestone_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface CreateColumnInput {
  projectId: number;
  name: string;
  orderIndex: number;
}

export interface CreateItemInput {
  projectId: number;
  columnId: number;
  title: string;
  creatorId: number;
  description?: string | null;
  assigneeId?: number | null;
  priority?: TodoPriority;
  dueDate?: string | null;
  orderIndex: number;
}

export interface UpdateItemInput {
  title?: string;
  description?: string | null;
  assigneeId?: number | null;
  priority?: TodoPriority;
  dueDate?: string | null;
  completedAt?: string | null;
  columnId?: number;
  orderIndex?: number;
  milestoneId?: number | null;
}

export class TodoRepository {
  constructor(private readonly db: SqliteDatabase) {}

  // ----- columns -----

  findColumns(projectId: number): TodoColumn[] {
    const rows = this.db.query<TodoColumnRow>(
      'SELECT * FROM todo_columns WHERE project_id = @projectId ORDER BY order_index ASC, id ASC',
      { projectId }
    );
    return rows.map(mapColumn);
  }

  findColumnById(id: number): TodoColumn | null {
    const row = this.db.get<TodoColumnRow>(
      'SELECT * FROM todo_columns WHERE id = @id',
      { id }
    );
    return row ? mapColumn(row) : null;
  }

  createColumn(input: CreateColumnInput): TodoColumn {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO todo_columns (project_id, name, order_index, created_at, updated_at)
       VALUES (@projectId, @name, @orderIndex, @createdAt, @updatedAt)`,
      {
        projectId: input.projectId,
        name: input.name,
        orderIndex: input.orderIndex,
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findColumnById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create column');
    return created;
  }

  updateColumn(
    id: number,
    input: { name?: string; orderIndex?: number }
  ): TodoColumn | null {
    const fields: string[] = ['updated_at = @updatedAt'];
    const params: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      id,
    };
    if (input.name !== undefined) {
      fields.push('name = @name');
      params.name = input.name;
    }
    if (input.orderIndex !== undefined) {
      fields.push('order_index = @orderIndex');
      params.orderIndex = input.orderIndex;
    }
    this.db.execute(
      `UPDATE todo_columns SET ${fields.join(', ')} WHERE id = @id`,
      params
    );
    return this.findColumnById(id);
  }

  deleteColumn(id: number): boolean {
    const result = this.db.execute('DELETE FROM todo_columns WHERE id = @id', {
      id,
    });
    return result.changes > 0;
  }

  // ----- items -----

  findItemsByProject(projectId: number): TodoItem[] {
    const rows = this.db.query<TodoItemRow>(
      `SELECT i.* FROM todo_items i
       INNER JOIN todo_columns c ON c.id = i.column_id
       WHERE i.project_id = @projectId AND i.deleted_at IS NULL
       ORDER BY c.order_index ASC, i.order_index ASC, i.id ASC`,
      { projectId }
    );
    return rows.map(mapItem);
  }

  findItemById(id: number): TodoItem | null {
    const row = this.db.get<TodoItemRow>(
      'SELECT * FROM todo_items WHERE id = @id AND deleted_at IS NULL',
      { id }
    );
    return row ? mapItem(row) : null;
  }

  maxItemOrderIndex(columnId: number): number {
    const row = this.db.get<{ max_index: number | null }>(
      'SELECT MAX(order_index) AS max_index FROM todo_items WHERE column_id = @columnId AND deleted_at IS NULL',
      { columnId }
    );
    return row?.max_index ?? -1;
  }

  createItem(input: CreateItemInput): TodoItem {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO todo_items (project_id, column_id, title, description, assignee_id, creator_id, priority, start_date, due_date, completed_at, order_index, milestone_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @columnId, @title, @description, @assigneeId, @creatorId, @priority, NULL, @dueDate, NULL, @orderIndex, @milestoneId, @createdAt, @updatedAt, NULL)`,
      {
        projectId: input.projectId,
        columnId: input.columnId,
        title: input.title,
        description: input.description ?? null,
        assigneeId: input.assigneeId ?? null,
        creatorId: input.creatorId,
        priority: input.priority ?? 'normal',
        dueDate: input.dueDate ?? null,
        orderIndex: input.orderIndex,
        milestoneId: null,
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findItemById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create todo item');
    return created;
  }

  updateItem(id: number, input: UpdateItemInput): TodoItem | null {
    const fields: string[] = ['updated_at = @updatedAt'];
    const params: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      id,
    };
    if (input.title !== undefined) {
      fields.push('title = @title');
      params.title = input.title;
    }
    if (input.description !== undefined) {
      fields.push('description = @description');
      params.description = input.description;
    }
    if (input.assigneeId !== undefined) {
      fields.push('assignee_id = @assigneeId');
      params.assigneeId = input.assigneeId;
    }
    if (input.priority !== undefined) {
      fields.push('priority = @priority');
      params.priority = input.priority;
    }
    if (input.dueDate !== undefined) {
      fields.push('due_date = @dueDate');
      params.dueDate = input.dueDate;
    }
    if (input.completedAt !== undefined) {
      fields.push('completed_at = @completedAt');
      params.completedAt = input.completedAt;
    }
    if (input.columnId !== undefined) {
      fields.push('column_id = @columnId');
      params.columnId = input.columnId;
    }
    if (input.orderIndex !== undefined) {
      fields.push('order_index = @orderIndex');
      params.orderIndex = input.orderIndex;
    }
    if (input.milestoneId !== undefined) {
      fields.push('milestone_id = @milestoneId');
      params.milestoneId = input.milestoneId;
    }
    this.db.execute(
      `UPDATE todo_items SET ${fields.join(', ')} WHERE id = @id AND deleted_at IS NULL`,
      params
    );
    return this.findItemById(id);
  }

  deleteItem(id: number): boolean {
    const result = this.db.execute(
      'UPDATE todo_items SET deleted_at = @now WHERE id = @id AND deleted_at IS NULL',
      { now: new Date().toISOString(), id }
    );
    return result.changes > 0;
  }
}
