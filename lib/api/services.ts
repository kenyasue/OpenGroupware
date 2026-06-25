import { getDb } from '@/lib/db/sqlite';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectService } from '@/services/ProjectService';
import { NotificationService } from '@/services/NotificationService';
import { ActivityLogService } from '@/services/ActivityLogService';
import { BoardService } from '@/services/BoardService';
import { BoardRepository } from '@/repositories/BoardRepository';
import { NoteService } from '@/services/NoteService';
import { ProjectNoteRepository } from '@/repositories/ProjectNoteRepository';
import { ChatService } from '@/services/ChatService';
import { ChatRepository } from '@/repositories/ChatRepository';
import { getSseHub } from '@/lib/sse/hub';
import { TodoService } from '@/services/TodoService';
import { TodoRepository } from '@/repositories/TodoRepository';
import { FileStorageService } from '@/services/FileStorageService';
import { FileRepository } from '@/repositories/FileRepository';
import { AttachmentService } from '@/services/AttachmentService';
import { AttachmentRepository } from '@/repositories/AttachmentRepository';
import { ScheduleService } from '@/services/ScheduleService';
import { CalendarRepository } from '@/repositories/CalendarRepository';
import { MilestoneRepository } from '@/repositories/MilestoneRepository';
import { MeetingService } from '@/services/MeetingService';
import { MeetingRepository } from '@/repositories/MeetingRepository';
import { SearchService } from '@/services/SearchService';
import { DashboardService } from '@/services/DashboardService';
import { BackupService } from '@/services/BackupService';

/**
 * Route Handler用に各Repository/Serviceを構築するファクトリ。
 * 依存はすべて同じgetDb()接続を共有し、トランザクション境界を機能させる。
 */
export function createProjectService(): ProjectService {
  const db = getDb();
  return new ProjectService(
    new ProjectRepository(db),
    new ProjectMemberRepository(db),
    new NotificationRepository(db),
    db
  );
}

export function createNotificationService(): NotificationService {
  return new NotificationService(new NotificationRepository(getDb()));
}

export function createActivityLogService(): ActivityLogService {
  return new ActivityLogService(new ActivityLogRepository(getDb()));
}

export function createBoardService(): BoardService {
  const db = getDb();
  const memberRepo = new ProjectMemberRepository(db);
  return new BoardService(
    new BoardRepository(db),
    memberRepo,
    new NotificationService(new NotificationRepository(db)),
    new ActivityLogService(new ActivityLogRepository(db)),
    new AttachmentService(
      new AttachmentRepository(db),
      new FileRepository(db),
      memberRepo
    ),
    db
  );
}

export function createNoteService(): NoteService {
  const db = getDb();
  return new NoteService(
    new ProjectNoteRepository(db),
    new ProjectMemberRepository(db),
    new NotificationService(new NotificationRepository(db)),
    new ActivityLogService(new ActivityLogRepository(db))
  );
}

export function createChatService(): ChatService {
  const db = getDb();
  const memberRepo = new ProjectMemberRepository(db);
  return new ChatService(
    new ChatRepository(db),
    memberRepo,
    new UserRepository(db),
    new NotificationService(new NotificationRepository(db)),
    getSseHub(),
    new AttachmentService(
      new AttachmentRepository(db),
      new FileRepository(db),
      memberRepo
    ),
    db
  );
}

export function createTodoService(): TodoService {
  const db = getDb();
  return new TodoService(
    new TodoRepository(db),
    new ProjectMemberRepository(db),
    new NotificationService(new NotificationRepository(db)),
    new ActivityLogService(new ActivityLogRepository(db)),
    getSseHub()
  );
}

export function createFileStorageService(): FileStorageService {
  const db = getDb();
  const uploadsDir = process.env.UPLOADS_PATH ?? './data/uploads';
  return new FileStorageService(
    new FileRepository(db),
    new ProjectMemberRepository(db),
    new NotificationService(new NotificationRepository(db)),
    new ActivityLogService(new ActivityLogRepository(db)),
    getSseHub(),
    uploadsDir
  );
}

export function createScheduleService(): ScheduleService {
  const db = getDb();
  return new ScheduleService(
    new CalendarRepository(db),
    new MilestoneRepository(db),
    new TodoRepository(db),
    new ProjectMemberRepository(db),
    new ActivityLogService(new ActivityLogRepository(db))
  );
}

export function createMeetingService(): MeetingService {
  const db = getDb();
  return new MeetingService(
    new MeetingRepository(db),
    new CalendarRepository(db),
    new TodoRepository(db),
    new ProjectMemberRepository(db),
    new NotificationService(new NotificationRepository(db)),
    new ActivityLogService(new ActivityLogRepository(db)),
    getSseHub(),
    db
  );
}

export function createSearchService(): SearchService {
  const db = getDb();
  return new SearchService(
    new BoardRepository(db),
    new ChatRepository(db),
    new TodoRepository(db),
    new FileRepository(db),
    new CalendarRepository(db),
    new MeetingRepository(db),
    new MilestoneRepository(db),
    new ProjectNoteRepository(db),
    new ProjectMemberRepository(db)
  );
}

export function createDashboardService(): DashboardService {
  const db = getDb();
  const memberRepo = new ProjectMemberRepository(db);
  const scheduleService = new ScheduleService(
    new CalendarRepository(db),
    new MilestoneRepository(db),
    new TodoRepository(db),
    memberRepo,
    new ActivityLogService(new ActivityLogRepository(db))
  );
  return new DashboardService(
    new ProjectRepository(db),
    new TodoRepository(db),
    new ChatRepository(db),
    new BoardRepository(db),
    new ProjectNoteRepository(db),
    new FileRepository(db),
    new MeetingRepository(db),
    new ActivityLogRepository(db),
    new NotificationRepository(db),
    memberRepo,
    scheduleService
  );
}

export function createBackupService(): BackupService {
  const dbPath = process.env.SQLITE_PATH ?? './data/app.db';
  const uploadsDir = process.env.UPLOADS_PATH ?? './data/uploads';
  const backupsDir = './backups';
  return new BackupService(dbPath, uploadsDir, backupsDir);
}

export function createUserRepository(): UserRepository {
  return new UserRepository(getDb());
}
