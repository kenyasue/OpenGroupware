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
  return new BoardService(
    new BoardRepository(db),
    new ProjectMemberRepository(db),
    new NotificationService(new NotificationRepository(db)),
    new ActivityLogService(new ActivityLogRepository(db))
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
  return new ChatService(
    new ChatRepository(db),
    new ProjectMemberRepository(db),
    new UserRepository(db),
    new NotificationService(new NotificationRepository(db)),
    getSseHub()
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

export function createUserRepository(): UserRepository {
  return new UserRepository(getDb());
}
