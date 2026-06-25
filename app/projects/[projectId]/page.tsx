import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createDashboardService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { DashboardWidget } from '@/components/project/DashboardWidget';
import { ForbiddenError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;

  const service = createDashboardService();
  let dashboard;
  try {
    dashboard = service.getProjectDashboard(user.id, Number(projectId));
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect('/dashboard');
    }
    throw error;
  }

  const { project } = dashboard;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="overview" />
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
            {project.status}
          </span>
        </div>
        {project.description && (
          <p className="text-gray-600 dark:text-gray-300">
            {project.description}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardWidget title="進行中ToDo" empty="ありません">
            {dashboard.inProgressTodos.map((t) => (
              <p key={t.id} className="text-sm">
                {t.title}
                {t.dueDate ? `（期限: ${t.dueDate}）` : ''}
              </p>
            ))}
          </DashboardWidget>

          <DashboardWidget title="期限が近いToDo (7日以内)" empty="ありません">
            {dashboard.nearDueTodos.map((t) => (
              <p key={t.id} className="text-sm">
                {t.title}（{t.dueDate}）
              </p>
            ))}
          </DashboardWidget>

          <DashboardWidget title="最新チャット (5件)" empty="ありません">
            {dashboard.latestChat.map((m) => (
              <p key={m.id} className="text-sm">
                {m.body}
              </p>
            ))}
          </DashboardWidget>

          <DashboardWidget title="最新掲示板 (5件)" empty="ありません">
            {dashboard.latestBoard.map((t) => (
              <a
                key={t.id}
                href={`/projects/${project.id}/board/${t.id}`}
                className="block text-sm text-blue-600 hover:underline"
              >
                {t.isPinned === 1 ? '📌 ' : ''}
                {t.title}
              </a>
            ))}
          </DashboardWidget>

          <DashboardWidget title="最新メモ (5件)" empty="ありません">
            {dashboard.latestNotes.map((n) => (
              <a
                key={n.id}
                href={`/projects/${project.id}/notes/${n.id}`}
                className="block text-sm text-blue-600 hover:underline"
              >
                {n.isPinned === 1 ? '📌 ' : ''}
                {n.title}
              </a>
            ))}
          </DashboardWidget>

          <DashboardWidget title="最近のファイル (5件)" empty="ありません">
            {dashboard.recentFiles.map((f) => (
              <p key={f.id} className="text-sm">
                {f.originalName}
              </p>
            ))}
          </DashboardWidget>

          <DashboardWidget title="次回ミーティング" empty="予定なし">
            {dashboard.nextMeeting && (
              <p className="text-sm">
                {dashboard.nextMeeting.title}（{dashboard.nextMeeting.startAt}）
              </p>
            )}
          </DashboardWidget>

          <DashboardWidget title="マイルストーン進捗" empty="ありません">
            {dashboard.milestones.map((m) => (
              <div key={m.id}>
                <p className="text-sm">
                  {m.title} - {m.progress}%
                </p>
                <div className="h-1.5 w-full rounded bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-1.5 rounded bg-blue-500"
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </DashboardWidget>

          <DashboardWidget
            title="最近のアクティビティ (10件)"
            empty="ありません"
          >
            {dashboard.recentActivity.map((l) => (
              <p key={l.id} className="text-sm">
                {l.action}（{l.targetType}）
              </p>
            ))}
          </DashboardWidget>
        </div>
      </main>
    </div>
  );
}
