import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import {
  createProjectService,
  createActivityLogService,
} from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ACTION_LABELS: Record<string, string> = {
  todo_created: 'ToDo作成',
  todo_updated: 'ToDo更新',
  todo_completed: 'ToDo完了',
  file_uploaded: 'ファイルアップロード',
  board_posted: '掲示板投稿',
  comment_added: 'コメント追加',
  note_created: 'メモ作成',
  note_updated: 'メモ更新',
  meeting_created: 'ミーティング作成',
  member_added: 'メンバー追加',
  milestone_updated: 'マイルストーン更新',
};

export default async function ProjectActivityPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const { projectId } = await params;

  const projectService = createProjectService();
  let project;
  try {
    project = projectService.getProject(user.id, Number(projectId));
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect('/dashboard');
    }
    throw error;
  }

  const activityService = createActivityLogService();
  const { items } = activityService.listByProject(project.id, 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="activity" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">アクティビティログ</h1>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">アクティビティはありません。</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-white shadow-sm">
            {items.map((log) => (
              <li key={log.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <span className="text-xs text-gray-400">{log.createdAt}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700">
                  {log.targetType}
                  {log.targetId !== null ? ` #${log.targetId}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
