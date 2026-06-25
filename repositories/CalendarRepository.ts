import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { CalendarEvent, CalendarEventType } from '@/lib/types';

interface CalendarEventRow {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  type: string;
  start_at: string;
  end_at: string | null;
  created_by_id: number;
  related_todo_id: number | null;
  related_milestone_id: number | null;
  related_meeting_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    type: row.type as CalendarEventType,
    startAt: row.start_at,
    endAt: row.end_at,
    createdById: row.created_by_id,
    relatedTodoId: row.related_todo_id,
    relatedMilestoneId: row.related_milestone_id,
    relatedMeetingId: row.related_meeting_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface CreateEventInput {
  projectId: number;
  title: string;
  description?: string | null;
  type: CalendarEventType;
  startAt: string;
  endAt?: string | null;
  createdById: number;
}

export class CalendarRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findByProject(projectId: number): CalendarEvent[] {
    const rows = this.db.query<CalendarEventRow>(
      'SELECT * FROM calendar_events WHERE project_id = @projectId AND deleted_at IS NULL ORDER BY start_at ASC, id ASC',
      { projectId }
    );
    return rows.map(mapEvent);
  }

  findByProjectInRange(
    projectId: number,
    from: string,
    to: string
  ): CalendarEvent[] {
    const rows = this.db.query<CalendarEventRow>(
      `SELECT * FROM calendar_events
       WHERE project_id = @projectId AND deleted_at IS NULL
         AND start_at >= @from AND start_at <= @to
       ORDER BY start_at ASC, id ASC`,
      { projectId, from, to }
    );
    return rows.map(mapEvent);
  }

  /** 指定ユーザーが作成したイベントのうち [from,to] と時間重複するもの(スケジュール重複判定用) */
  findByCreatorInRange(
    userId: number,
    from: string,
    to: string
  ): CalendarEvent[] {
    const rows = this.db.query<CalendarEventRow>(
      `SELECT * FROM calendar_events
       WHERE created_by_id = @userId AND deleted_at IS NULL
         AND end_at IS NOT NULL
         AND start_at <= @to AND end_at >= @from
       ORDER BY start_at ASC`,
      { userId, from, to }
    );
    return rows.map(mapEvent);
  }

  findEventById(id: number): CalendarEvent | null {
    const row = this.db.get<CalendarEventRow>(
      'SELECT * FROM calendar_events WHERE id = @id AND deleted_at IS NULL',
      { id }
    );
    return row ? mapEvent(row) : null;
  }

  create(input: CreateEventInput): CalendarEvent {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO calendar_events (project_id, title, description, type, start_at, end_at, created_by_id, related_todo_id, related_milestone_id, related_meeting_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @description, @type, @startAt, @endAt, @createdById, NULL, NULL, NULL, @createdAt, @updatedAt, NULL)`,
      {
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        startAt: input.startAt,
        endAt: input.endAt ?? null,
        createdById: input.createdById,
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findEventById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create calendar event');
    return created;
  }

  update(
    id: number,
    input: {
      title?: string;
      description?: string | null;
      startAt?: string;
      endAt?: string | null;
    }
  ): CalendarEvent | null {
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
    if (input.startAt !== undefined) {
      fields.push('start_at = @startAt');
      params.startAt = input.startAt;
    }
    if (input.endAt !== undefined) {
      fields.push('end_at = @endAt');
      params.endAt = input.endAt;
    }
    this.db.execute(
      `UPDATE calendar_events SET ${fields.join(', ')} WHERE id = @id AND deleted_at IS NULL`,
      params
    );
    return this.findEventById(id);
  }

  delete(id: number): boolean {
    const result = this.db.execute(
      'UPDATE calendar_events SET deleted_at = @now WHERE id = @id AND deleted_at IS NULL',
      { now: new Date().toISOString(), id }
    );
    return result.changes > 0;
  }
}
