import type { SqliteDatabase } from '@/lib/db/sqlite';
import type {
  Milestone,
  MilestoneStatus,
  TodoItem,
  TodoPriority,
} from '@/lib/types';

interface MilestoneRow {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  tags: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapMilestone(row: MilestoneRow): Milestone {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    status: row.status as MilestoneStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapTodo(row: TodoItemRow): TodoItem {
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
    tags: row.tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface CreateMilestoneInput {
  projectId: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
}

export class MilestoneRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findByProject(projectId: number): Milestone[] {
    const rows = this.db.query<MilestoneRow>(
      'SELECT * FROM milestones WHERE project_id = @projectId AND deleted_at IS NULL ORDER BY due_date ASC, id ASC',
      { projectId }
    );
    return rows.map(mapMilestone);
  }

  findById(id: number): Milestone | null {
    const row = this.db.get<MilestoneRow>(
      'SELECT * FROM milestones WHERE id = @id AND deleted_at IS NULL',
      { id }
    );
    return row ? mapMilestone(row) : null;
  }

  create(input: CreateMilestoneInput): Milestone {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO milestones (project_id, title, description, due_date, status, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @description, @dueDate, 'open', @createdAt, @updatedAt, NULL)`,
      {
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create milestone');
    return created;
  }

  update(
    id: number,
    input: {
      title?: string;
      description?: string | null;
      dueDate?: string | null;
      status?: MilestoneStatus;
    }
  ): Milestone | null {
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
    if (input.dueDate !== undefined) {
      fields.push('due_date = @dueDate');
      params.dueDate = input.dueDate;
    }
    if (input.status !== undefined) {
      fields.push('status = @status');
      params.status = input.status;
    }
    this.db.execute(
      `UPDATE milestones SET ${fields.join(', ')} WHERE id = @id AND deleted_at IS NULL`,
      params
    );
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db.execute(
      'UPDATE milestones SET deleted_at = @now WHERE id = @id AND deleted_at IS NULL',
      { now: new Date().toISOString(), id }
    );
    return result.changes > 0;
  }

  /** マイルストーンに紐づくToDo一覧(論理削除除外) */
  findToDosByMilestone(milestoneId: number): TodoItem[] {
    const rows = this.db.query<TodoItemRow>(
      'SELECT * FROM todo_items WHERE milestone_id = @milestoneId AND deleted_at IS NULL',
      { milestoneId }
    );
    return rows.map(mapTodo);
  }
}
