import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { Meeting, MeetingMember, MeetingMemberStatus } from '@/lib/types';

interface MeetingRow {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  location: string | null;
  meeting_url: string | null;
  start_at: string;
  end_at: string;
  agenda_md: string | null;
  minutes_md: string | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface MeetingMemberRow {
  id: number;
  meeting_id: number;
  user_id: number;
  status: string;
}

function mapMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    location: row.location,
    meetingUrl: row.meeting_url,
    startAt: row.start_at,
    endAt: row.end_at,
    agendaMd: row.agenda_md,
    minutesMd: row.minutes_md,
    createdById: row.created_by_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapMember(row: MeetingMemberRow): MeetingMember {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    userId: row.user_id,
    status: row.status as MeetingMemberStatus,
  };
}

export interface CreateMeetingInput {
  projectId: number;
  title: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  startAt: string;
  endAt: string;
  agendaMd?: string | null;
  createdById: number;
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  startAt?: string;
  endAt?: string;
  agendaMd?: string | null;
  minutesMd?: string | null;
}

export class MeetingRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findByProject(projectId: number): Meeting[] {
    const rows = this.db.query<MeetingRow>(
      'SELECT * FROM meetings WHERE project_id = @projectId AND deleted_at IS NULL ORDER BY start_at ASC, id ASC',
      { projectId }
    );
    return rows.map(mapMeeting);
  }

  findById(id: number): Meeting | null {
    const row = this.db.get<MeetingRow>(
      'SELECT * FROM meetings WHERE id = @id AND deleted_at IS NULL',
      { id }
    );
    return row ? mapMeeting(row) : null;
  }

  create(input: CreateMeetingInput): Meeting {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO meetings (project_id, title, description, location, meeting_url, start_at, end_at, agenda_md, minutes_md, created_by_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @description, @location, @meetingUrl, @startAt, @endAt, @agendaMd, NULL, @createdById, @createdAt, @updatedAt, NULL)`,
      {
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        meetingUrl: input.meetingUrl ?? null,
        startAt: input.startAt,
        endAt: input.endAt,
        agendaMd: input.agendaMd ?? null,
        createdById: input.createdById,
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findById(Number(result.lastInsertRowid));
    if (!created) throw new Error('Failed to create meeting');
    return created;
  }

  update(id: number, input: UpdateMeetingInput): Meeting | null {
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
    if (input.location !== undefined) {
      fields.push('location = @location');
      params.location = input.location;
    }
    if (input.meetingUrl !== undefined) {
      fields.push('meeting_url = @meetingUrl');
      params.meetingUrl = input.meetingUrl;
    }
    if (input.startAt !== undefined) {
      fields.push('start_at = @startAt');
      params.startAt = input.startAt;
    }
    if (input.endAt !== undefined) {
      fields.push('end_at = @endAt');
      params.endAt = input.endAt;
    }
    if (input.agendaMd !== undefined) {
      fields.push('agenda_md = @agendaMd');
      params.agendaMd = input.agendaMd;
    }
    if (input.minutesMd !== undefined) {
      fields.push('minutes_md = @minutesMd');
      params.minutesMd = input.minutesMd;
    }
    this.db.execute(
      `UPDATE meetings SET ${fields.join(', ')} WHERE id = @id AND deleted_at IS NULL`,
      params
    );
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db.execute(
      'UPDATE meetings SET deleted_at = @now WHERE id = @id AND deleted_at IS NULL',
      { now: new Date().toISOString(), id }
    );
    return result.changes > 0;
  }

  // ----- members -----

  findMembersByMeeting(meetingId: number): MeetingMember[] {
    const rows = this.db.query<MeetingMemberRow>(
      'SELECT * FROM meeting_members WHERE meeting_id = @meetingId ORDER BY id ASC',
      { meetingId }
    );
    return rows.map(mapMember);
  }

  addMember(meetingId: number, userId: number): MeetingMember {
    const result = this.db.execute(
      `INSERT INTO meeting_members (meeting_id, user_id, status) VALUES (@meetingId, @userId, 'invited')`,
      { meetingId, userId }
    );
    return {
      id: Number(result.lastInsertRowid),
      meetingId,
      userId,
      status: 'invited',
    };
  }

  removeMember(meetingId: number, userId: number): boolean {
    const result = this.db.execute(
      'DELETE FROM meeting_members WHERE meeting_id = @meetingId AND user_id = @userId',
      { meetingId, userId }
    );
    return result.changes > 0;
  }

  /** ユーザーが参加するミーティングのうち、[from,to]と時間重複するもの(重複判定用) */
  findMeetingsByUserInRange(
    userId: number,
    from: string,
    to: string,
    excludeMeetingId?: number
  ): Meeting[] {
    const rows = this.db.query<MeetingRow>(
      `SELECT m.* FROM meetings m
       INNER JOIN meeting_members mm ON mm.meeting_id = m.id
       WHERE mm.user_id = @userId AND m.deleted_at IS NULL
         AND m.start_at <= @to AND m.end_at >= @from
       ORDER BY m.start_at ASC`,
      { userId, from, to }
    );
    const meetings = rows.map(mapMeeting);
    return excludeMeetingId !== undefined
      ? meetings.filter((m) => m.id !== excludeMeetingId)
      : meetings;
  }
}
