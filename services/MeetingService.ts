import type { SqliteDatabase } from '@/lib/db/sqlite';
import { MeetingRepository } from '@/repositories/MeetingRepository';
import { CalendarRepository } from '@/repositories/CalendarRepository';
import { TodoRepository } from '@/repositories/TodoRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { SseHub } from '@/lib/sse/hub';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import type { Meeting, MeetingMember } from '@/lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ScheduleConflict {
  userId: number;
  type: 'meeting' | 'calendar_event' | 'important_todo';
  refId: number;
  title: string;
  startAt: string;
  endAt: string | null;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  startAt: string;
  endAt: string;
  agendaMd?: string | null;
  memberIds: number[];
}

/**
 * ミーティング管理とスケジュール重複判定を担うService。
 */
export class MeetingService {
  constructor(
    private readonly meetingRepository: MeetingRepository,
    private readonly calendarRepository: CalendarRepository,
    private readonly todoRepository: TodoRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService,
    private readonly sseHub: SseHub,
    private readonly db: SqliteDatabase
  ) {}

  getMeetings(actorId: number, projectId: number): Meeting[] {
    this.requireMember(projectId, actorId);
    return this.meetingRepository.findByProject(projectId);
  }

  getMeeting(
    actorId: number,
    meetingId: number
  ): {
    meeting: Meeting;
    members: MeetingMember[];
  } {
    const meeting = this.meetingRepository.findById(meetingId);
    if (!meeting) throw new NotFoundError('Meeting', meetingId);
    this.requireMember(meeting.projectId, actorId);
    return {
      meeting,
      members: this.meetingRepository.findMembersByMeeting(meetingId),
    };
  }

  createMeeting(
    actorId: number,
    projectId: number,
    input: CreateMeetingRequest
  ): { meeting: Meeting; conflicts: ScheduleConflict[] } {
    this.requireMember(projectId, actorId);
    this.validate(input);
    const conflicts = this.checkScheduleConflicts(
      projectId,
      input.memberIds,
      input.startAt,
      input.endAt
    );

    const meeting = this.db.transaction(() => {
      const created = this.meetingRepository.create({
        projectId,
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        meetingUrl: input.meetingUrl ?? null,
        startAt: input.startAt,
        endAt: input.endAt,
        agendaMd: input.agendaMd ?? null,
        createdById: actorId,
      });
      for (const userId of input.memberIds) {
        this.meetingRepository.addMember(created.id, userId);
      }
      return created;
    });

    if (input.memberIds.length > 0) {
      this.notificationService.notifyOnEvent({
        type: 'meeting_invited',
        projectId,
        title: `ミーティング「${meeting.title}」に招待されました`,
        body: `${meeting.startAt} 〜 ${meeting.endAt}`,
        memberIds: input.memberIds,
      });
    }
    this.activityLogService.logActivity({
      projectId,
      actorId,
      action: 'meeting_created',
      targetType: 'meeting',
      targetId: meeting.id,
    });
    this.sseHub.broadcast(projectId, {
      type: 'meeting.created',
      data: { projectId },
    });
    return { meeting, conflicts };
  }

  updateMeeting(
    actorId: number,
    meetingId: number,
    input: Partial<CreateMeetingRequest>
  ): Meeting {
    const meeting = this.meetingRepository.findById(meetingId);
    if (!meeting) throw new NotFoundError('Meeting', meetingId);
    this.requireMember(meeting.projectId, actorId);
    const updated = this.meetingRepository.update(meetingId, {
      title: input.title,
      description: input.description,
      location: input.location,
      meetingUrl: input.meetingUrl,
      startAt: input.startAt,
      endAt: input.endAt,
      agendaMd: input.agendaMd,
    });
    if (!updated) throw new NotFoundError('Meeting', meetingId);
    return updated;
  }

  updateMinutes(
    actorId: number,
    meetingId: number,
    minutesMd: string
  ): Meeting {
    const meeting = this.meetingRepository.findById(meetingId);
    if (!meeting) throw new NotFoundError('Meeting', meetingId);
    this.requireMember(meeting.projectId, actorId);
    const updated = this.meetingRepository.update(meetingId, { minutesMd });
    if (!updated) throw new NotFoundError('Meeting', meetingId);
    return updated;
  }

  deleteMeeting(actorId: number, meetingId: number): void {
    const meeting = this.meetingRepository.findById(meetingId);
    if (!meeting) throw new NotFoundError('Meeting', meetingId);
    const role = this.projectMemberRepository.getRole(
      meeting.projectId,
      actorId
    );
    if (meeting.createdById !== actorId && role !== 'admin') {
      throw new ForbiddenError('作成者または管理者のみ削除できます');
    }
    this.meetingRepository.delete(meetingId);
  }

  /**
   * スケジュール重複判定:
   * 各メンバーについて (1)他ミーティング (2)カレンダーイベント (3)期限±3日の重要ToDo を検出。
   * 重複は警告(作成ブロックしない)。時間重複 = NOT(existing.end <= new.start OR existing.start >= new.end)
   */
  checkScheduleConflicts(
    projectId: number,
    memberIds: number[],
    startAt: string,
    endAt: string,
    excludeMeetingId?: number
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const newStart = new Date(startAt).getTime();
    const newEnd = new Date(endAt).getTime();
    const fromDate = new Date(newStart - 3 * DAY_MS);
    const toDate = new Date(newStart + 3 * DAY_MS);
    const fromDay = this.toDateStr(fromDate);
    const toDay = this.toDateStr(toDate);

    for (const userId of memberIds) {
      // 1. 他ミーティング(meeting_members経由・時間重複)
      const meetings = this.meetingRepository.findMeetingsByUserInRange(
        userId,
        startAt,
        endAt,
        excludeMeetingId
      );
      for (const m of meetings) {
        if (this.overlaps(newStart, newEnd, m.startAt, m.endAt)) {
          conflicts.push({
            userId,
            type: 'meeting',
            refId: m.id,
            title: m.title,
            startAt: m.startAt,
            endAt: m.endAt,
          });
        }
      }

      // 2. カレンダーイベント(本人作成・時間重複)
      const events = this.calendarRepository.findByCreatorInRange(
        userId,
        startAt,
        endAt
      );
      for (const e of events) {
        if (e.endAt && this.overlaps(newStart, newEnd, e.startAt, e.endAt)) {
          conflicts.push({
            userId,
            type: 'calendar_event',
            refId: e.id,
            title: e.title,
            startAt: e.startAt,
            endAt: e.endAt,
          });
        }
      }

      // 3. 期限±3日の重要タスク(priority=high)
      const todos = this.todoRepository.findHighPriorityByAssignee(
        projectId,
        userId,
        fromDay,
        toDay
      );
      for (const t of todos) {
        conflicts.push({
          userId,
          type: 'important_todo',
          refId: t.id,
          title: t.title,
          startAt: t.dueDate ?? '',
          endAt: null,
        });
      }
    }
    return conflicts;
  }

  private overlaps(
    newStart: number,
    newEnd: number,
    existingStart: string,
    existingEnd: string
  ): boolean {
    const s = new Date(existingStart).getTime();
    const e = new Date(existingEnd).getTime();
    return !(e <= newStart || s >= newEnd);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }

  private requireMember(projectId: number, actorId: number): void {
    if (!this.projectMemberRepository.isMember(projectId, actorId)) {
      throw new ForbiddenError('プロジェクトに参加していません');
    }
  }

  private validate(input: CreateMeetingRequest): void {
    if (!input.title.trim()) {
      throw new ValidationError('タイトルを入力してください', 'title');
    }
    if (!input.startAt || !input.endAt) {
      throw new ValidationError('開始/終了日時を入力してください', 'startAt');
    }
    if (new Date(input.startAt) >= new Date(input.endAt)) {
      throw new ValidationError(
        '終了日時は開始日時より後にしてください',
        'endAt'
      );
    }
  }
}
