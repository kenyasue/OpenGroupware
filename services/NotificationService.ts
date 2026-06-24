import { NotificationRepository } from '@/repositories/NotificationRepository';
import type { SseBroadcaster } from '@/lib/types';
import type {
  Notification,
  NotificationEvent,
  NotificationType,
} from '@/lib/types';
import type { Paginated } from '@/repositories/NotificationRepository';

/**
 * 通知生成を担うService。
 * イベント種別に応じた対象ユーザー解決(resolveTargets)と通知作成を行う。
 * SSE配信は注入可能なbroadcaster経由(M8でSseHubを注入。M5では省略可能)。
 */
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly broadcaster?: SseBroadcaster | null
  ) {}

  /** イベント発生時に通知を作成し、SSE配信する */
  notifyOnEvent(event: NotificationEvent): Notification[] {
    const targetUserIds = this.resolveTargets(event);
    const created: Notification[] = [];
    for (const userId of targetUserIds) {
      const notification = this.notificationRepository.create({
        userId,
        projectId: event.projectId,
        type: event.type,
        title: event.title,
        body: event.body,
      });
      created.push(notification);
    }
    if (event.projectId !== null && this.broadcaster) {
      this.broadcaster.broadcast(event.projectId, {
        type: 'notification.created',
        data: { projectId: event.projectId },
      });
    }
    return created;
  }

  /** イベント種別から対象ユーザーIDの集合を解決する */
  resolveTargets(event: NotificationEvent): number[] {
    switch (event.type) {
      case 'mention':
        return [event.mentionedUserId];
      case 'todo_assigned':
        return [event.assigneeId];
      case 'todo_due_soon':
        return [event.assigneeId];
      case 'meeting_invited':
        return event.memberIds;
      case 'board_commented':
        return [event.threadAuthorId];
      case 'project_added':
        return [event.addedUserId];
      case 'file_shared':
        return event.projectMemberIds;
      case 'note_updated':
        return event.projectMemberIds;
    }
  }

  listUnread(userId: number, page: number = 1): Paginated<Notification> {
    return this.notificationRepository.findUnreadByUser(userId, page);
  }

  countUnread(userId: number): number {
    return this.notificationRepository.countUnreadByUser(userId);
  }

  markRead(id: number, userId: number): boolean {
    return this.notificationRepository.markRead(id, userId);
  }
}

/** 型安全性のためのヘルパー: NotificationEvent.type → NotificationType */
export function eventTypeToType(
  type: NotificationEvent['type']
): NotificationType {
  return type;
}
