import { ProjectRepository } from '@/repositories/ProjectRepository';
import { TodoRepository } from '@/repositories/TodoRepository';
import { ChatRepository } from '@/repositories/ChatRepository';
import { BoardRepository } from '@/repositories/BoardRepository';
import { ProjectNoteRepository } from '@/repositories/ProjectNoteRepository';
import { FileRepository } from '@/repositories/FileRepository';
import { MeetingRepository } from '@/repositories/MeetingRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { ScheduleService } from '@/services/ScheduleService';
import { ForbiddenError } from '@/lib/errors';
import type {
  ActivityLog,
  BoardThread,
  ChatMessage,
  FileAsset,
  Meeting,
  Project,
  ProjectNote,
  TodoItem,
} from '@/lib/types';

// MilestoneWithProgress is exported from ScheduleService; derive structurally
type MilestoneWithProgress = ReturnType<
  ScheduleService['getMilestones']
>[number];

export interface ProjectDashboard {
  project: Project;
  inProgressTodos: TodoItem[];
  nearDueTodos: TodoItem[];
  latestChat: ChatMessage[];
  latestBoard: BoardThread[];
  latestNotes: ProjectNote[];
  recentFiles: FileAsset[];
  nextMeeting: Meeting | null;
  milestones: MilestoneWithProgress[];
  recentActivity: ActivityLog[];
}

export interface PersonalDashboard {
  projects: Project[];
  incompleteTodos: TodoItem[];
  upcomingMeetings: Meeting[];
  unreadNotificationCount: number;
  overdueTasks: TodoItem[];
  recentActivity: ActivityLog[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 個人/プロジェクトダッシュボードの集計を担うService。
 */
export class DashboardService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly todoRepository: TodoRepository,
    private readonly chatRepository: ChatRepository,
    private readonly boardRepository: BoardRepository,
    private readonly noteRepository: ProjectNoteRepository,
    private readonly fileRepository: FileRepository,
    private readonly meetingRepository: MeetingRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly scheduleService: ScheduleService
  ) {}

  getProjectDashboard(actorId: number, projectId: number): ProjectDashboard {
    const project = this.projectRepository.findById(projectId);
    if (!project) throw new ForbiddenError('プロジェクトに参加していません');
    if (!this.projectMemberRepository.isMember(projectId, actorId)) {
      throw new ForbiddenError('プロジェクトに参加していません');
    }

    const todos = this.todoRepository.findItemsByProject(projectId);
    const now = new Date();
    const nowIso = now.toISOString();
    const sevenDaysLater = new Date(now.getTime() + 7 * DAY_MS).toISOString();
    const todayPrefix = nowIso.slice(0, 10);

    return {
      project,
      inProgressTodos: todos.filter((t) => t.completedAt === null),
      nearDueTodos: todos.filter(
        (t) =>
          t.completedAt === null &&
          t.dueDate !== null &&
          t.dueDate >= todayPrefix &&
          t.dueDate <= sevenDaysLater.slice(0, 10)
      ),
      latestChat: this.chatRepository.findMessages(projectId, {
        page: 1,
        pageSize: 5,
      }).items,
      latestBoard: this.boardRepository.findThreads(projectId, {
        page: 1,
        pageSize: 5,
      }).items,
      latestNotes: this.noteRepository.findNotes(projectId, {
        page: 1,
        pageSize: 5,
      }).items,
      recentFiles: this.fileRepository.findFilesByProject(projectId, 1, 5)
        .items,
      nextMeeting:
        this.meetingRepository
          .findByProject(projectId)
          .filter((m) => m.startAt >= nowIso)
          .sort((a, b) => (a.startAt < b.startAt ? -1 : 1))[0] ?? null,
      milestones: this.scheduleService.getMilestones(actorId, projectId),
      recentActivity: this.activityLogRepository.findByProject(projectId, 1, 10)
        .items,
    };
  }

  getPersonalDashboard(userId: number): PersonalDashboard {
    const projects = this.projectRepository.findProjectsByUserId(userId);
    const nowIso = new Date().toISOString();
    const todayPrefix = nowIso.slice(0, 10);
    const in30Days = new Date(Date.now() + 30 * DAY_MS).toISOString();

    const incompleteTodos: TodoItem[] = [];
    const recentActivity: ActivityLog[] = [];
    for (const project of projects) {
      const todos = this.todoRepository
        .findItemsByProject(project.id)
        .filter((t) => t.assigneeId === userId && t.completedAt === null);
      incompleteTodos.push(...todos);
      recentActivity.push(
        ...this.activityLogRepository.findByProject(project.id, 1, 10).items
      );
    }
    recentActivity.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const upcomingMeetings = this.meetingRepository
      .findMeetingsByUserInRange(userId, nowIso, in30Days)
      .sort((a, b) => (a.startAt < b.startAt ? -1 : 1))
      .slice(0, 5);

    return {
      projects,
      incompleteTodos,
      upcomingMeetings,
      unreadNotificationCount:
        this.notificationRepository.countUnreadByUser(userId),
      overdueTasks: incompleteTodos.filter(
        (t) => t.dueDate !== null && t.dueDate < todayPrefix
      ),
      recentActivity: recentActivity.slice(0, 10),
    };
  }
}
