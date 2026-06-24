import { getDb } from '@/lib/db/sqlite';
import { ProjectRepository } from '@/repositories/ProjectRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { NotificationRepository } from '@/repositories/NotificationRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { ProjectService } from '@/services/ProjectService';

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

export function createUserRepository(): UserRepository {
  return new UserRepository(getDb());
}
