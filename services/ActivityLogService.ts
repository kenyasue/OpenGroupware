import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import type { ActivityLog } from '@/lib/types';
import type { Paginated } from '@/repositories/NotificationRepository';

export interface LogActivityInput {
  projectId: number;
  actorId: number;
  action: string;
  targetType: string;
  targetId: number | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * アクティビティログ記録を担うService。
 * 変更操作をプロジェクト単位の時系列ログとして記録する。
 */
export class ActivityLogService {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  logActivity(input: LogActivityInput): ActivityLog {
    return this.activityLogRepository.create({
      projectId: input.projectId,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    });
  }

  listByProject(projectId: number, page: number = 1): Paginated<ActivityLog> {
    return this.activityLogRepository.findByProject(projectId, page);
  }
}
