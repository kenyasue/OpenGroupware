import type { Notification } from '@/lib/types';
import { MarkReadButton } from '@/components/notifications/MarkReadButton';

const TYPE_LABELS: Record<string, string> = {
  mention: 'メンション',
  todo_assigned: 'ToDo担当',
  todo_due_soon: 'ToDo期限',
  meeting_invited: 'ミーティング招待',
  board_commented: '掲示板コメント',
  project_added: 'プロジェクト追加',
  file_shared: 'ファイル共有',
  note_updated: 'メモ更新',
};

export function NotificationList({
  notifications,
}: {
  notifications: Notification[];
}) {
  if (notifications.length === 0) {
    return <p className="text-sm text-gray-400">未読の通知はありません。</p>;
  }

  return (
    <ul className="divide-y rounded-lg border bg-white shadow-sm">
      {notifications.map((notification) => (
        <li key={notification.id} className="p-4">
          <div className="flex items-center justify-between">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {TYPE_LABELS[notification.type] ?? notification.type}
            </span>
            <MarkReadButton notificationId={notification.id} />
          </div>
          <p className="mt-2 font-medium text-gray-800">{notification.title}</p>
          {notification.body && (
            <p className="mt-1 text-sm text-gray-600">{notification.body}</p>
          )}
          {notification.projectId !== null && (
            <a
              href={`/projects/${notification.projectId}`}
              className="mt-1 inline-block text-xs text-blue-600 hover:underline"
            >
              プロジェクトを開く
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
