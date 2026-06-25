import {
  CalendarRepository,
  type CreateEventInput,
} from '@/repositories/CalendarRepository';
import {
  MilestoneRepository,
  type CreateMilestoneInput,
} from '@/repositories/MilestoneRepository';
import { TodoRepository } from '@/repositories/TodoRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { ActivityLogService } from '@/services/ActivityLogService';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import type {
  CalendarEvent,
  CalendarEventType,
  Milestone,
  MilestoneStatus,
} from '@/lib/types';

/** カレンダー集約ビュー(複数ソースを統一表示) */
export interface CalendarEventView {
  key: string;
  projectId: number;
  title: string;
  description: string | null;
  type: CalendarEventType;
  startAt: string;
  endAt: string | null;
  source: 'event' | 'milestone' | 'todo';
  refId: number;
}

export interface MilestoneWithProgress extends Milestone {
  progress: number;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: MilestoneStatus;
}

/**
 * カレンダーイベント集約とマイルストーン管理を担うService。
 * カレンダーイベントの集計(カスタムイベント+マイルストーン+ToDo)と
 * マイルストーン進捗率自動計算を行う。
 */
export class ScheduleService {
  constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly todoRepository: TodoRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly activityLogService: ActivityLogService
  ) {}

  getCalendarEvents(
    actorId: number,
    projectId: number,
    range: { from: string; to: string }
  ): CalendarEventView[] {
    this.requireMember(projectId, actorId);
    const views: CalendarEventView[] = [];

    for (const e of this.calendarRepository.findByProjectInRange(
      projectId,
      range.from,
      range.to
    )) {
      views.push({
        key: `event-${e.id}`,
        projectId,
        title: e.title,
        description: e.description,
        type: e.type,
        startAt: e.startAt,
        endAt: e.endAt,
        source: 'event',
        refId: e.id,
      });
    }
    for (const m of this.milestoneRepository.findByProject(projectId)) {
      if (!m.dueDate) continue;
      if (m.dueDate >= range.from && m.dueDate <= range.to) {
        views.push({
          key: `milestone-${m.id}`,
          projectId,
          title: `マイルストーン: ${m.title}`,
          description: m.description,
          type: 'milestone',
          startAt: m.dueDate,
          endAt: m.dueDate,
          source: 'milestone',
          refId: m.id,
        });
      }
    }
    for (const t of this.todoRepository.findItemsByProject(projectId)) {
      const start = t.dueDate ?? t.startDate;
      if (!start) continue;
      if (start >= range.from && start <= range.to) {
        views.push({
          key: `todo-${t.id}`,
          projectId,
          title: `ToDo: ${t.title}`,
          description: t.description,
          type: 'todo',
          startAt: start,
          endAt: t.dueDate ?? null,
          source: 'todo',
          refId: t.id,
        });
      }
    }
    return views.sort((a, b) =>
      a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0
    );
  }

  // ----- calendar events -----
  createEvent(
    actorId: number,
    input: Omit<CreateEventInput, 'projectId' | 'createdById'> & {
      projectId: number;
    }
  ): CalendarEvent {
    this.requireMember(input.projectId, actorId);
    if (!input.title.trim()) {
      throw new ValidationError('タイトルを入力してください', 'title');
    }
    return this.calendarRepository.create({
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      createdById: actorId,
    });
  }

  updateEvent(
    actorId: number,
    eventId: number,
    input: {
      title?: string;
      description?: string | null;
      startAt?: string;
      endAt?: string | null;
    }
  ): CalendarEvent {
    const event = this.calendarRepository.findEventById(eventId);
    if (!event) throw new NotFoundError('CalendarEvent', eventId);
    this.requireMember(event.projectId, actorId);
    const updated = this.calendarRepository.update(eventId, input);
    if (!updated) throw new NotFoundError('CalendarEvent', eventId);
    return updated;
  }

  deleteEvent(actorId: number, eventId: number): void {
    const event = this.calendarRepository.findEventById(eventId);
    if (!event) throw new NotFoundError('CalendarEvent', eventId);
    this.requireMember(event.projectId, actorId);
    const role = this.projectMemberRepository.getRole(event.projectId, actorId);
    if (event.createdById !== actorId && role !== 'admin') {
      throw new ForbiddenError('作成者または管理者のみ削除できます');
    }
    this.calendarRepository.delete(eventId);
  }

  // ----- milestones -----
  getMilestones(actorId: number, projectId: number): MilestoneWithProgress[] {
    this.requireMember(projectId, actorId);
    return this.milestoneRepository.findByProject(projectId).map((m) => ({
      ...m,
      progress: this.calcMilestoneProgress(m.id),
    }));
  }

  createMilestone(
    actorId: number,
    projectId: number,
    input: Omit<CreateMilestoneInput, 'projectId'>
  ): Milestone {
    this.requireMember(projectId, actorId);
    if (!input.title.trim()) {
      throw new ValidationError('タイトルを入力してください', 'title');
    }
    return this.milestoneRepository.create({ ...input, projectId });
  }

  updateMilestone(
    actorId: number,
    milestoneId: number,
    input: UpdateMilestoneInput
  ): Milestone {
    const milestone = this.milestoneRepository.findById(milestoneId);
    if (!milestone) throw new NotFoundError('Milestone', milestoneId);
    this.requireMember(milestone.projectId, actorId);
    const updated = this.milestoneRepository.update(milestoneId, input);
    if (!updated) throw new NotFoundError('Milestone', milestoneId);
    this.activityLogService.logActivity({
      projectId: milestone.projectId,
      actorId,
      action: 'milestone_updated',
      targetType: 'milestone',
      targetId: milestoneId,
    });
    return updated;
  }

  deleteMilestone(actorId: number, milestoneId: number): void {
    const milestone = this.milestoneRepository.findById(milestoneId);
    if (!milestone) throw new NotFoundError('Milestone', milestoneId);
    this.requireMember(milestone.projectId, actorId);
    const role = this.projectMemberRepository.getRole(
      milestone.projectId,
      actorId
    );
    if (role !== 'admin') {
      throw new ForbiddenError('管理者のみ削除できます');
    }
    this.milestoneRepository.delete(milestoneId);
  }

  getMilestoneProgress(actorId: number, milestoneId: number): number {
    const milestone = this.milestoneRepository.findById(milestoneId);
    if (!milestone) throw new NotFoundError('Milestone', milestoneId);
    this.requireMember(milestone.projectId, actorId);
    return this.calcMilestoneProgress(milestoneId);
  }

  /** 進捗率: 関連ToDoの完了率(0件時0%) */
  calcMilestoneProgress(milestoneId: number): number {
    const todos = this.milestoneRepository.findToDosByMilestone(milestoneId);
    if (todos.length === 0) return 0;
    const completed = todos.filter((t) => t.completedAt !== null).length;
    return Math.round((completed / todos.length) * 100);
  }

  private requireMember(projectId: number, actorId: number): void {
    if (!this.projectMemberRepository.isMember(projectId, actorId)) {
      throw new ForbiddenError('プロジェクトに参加していません');
    }
  }
}
