import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createDashboardService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { CreateProjectForm } from '@/components/project/CreateProjectForm';
import { DashboardWidget } from '@/components/project/DashboardWidget';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const service = createDashboardService();
  const dashboard = service.getPersonalDashboard(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardWidget title="参加プロジェクト" empty="ありません">
            {dashboard.projects.map((p) => (
              <a
                key={p.id}
                href={`/projects/${p.id}`}
                className="block rounded border px-3 py-2 text-sm hover:bg-gray-50"
              >
                {p.name}（{p.status}）
              </a>
            ))}
          </DashboardWidget>

          <DashboardWidget
            title={`未読通知 (${dashboard.unreadNotificationCount})`}
            empty="未読はありません"
          >
            <a
              href="/notifications"
              className="text-sm text-blue-600 hover:underline"
            >
              通知一覧を開く
            </a>
          </DashboardWidget>

          <DashboardWidget title="未完了ToDo" empty="ありません">
            {dashboard.incompleteTodos.map((t) => (
              <p key={t.id} className="text-sm">
                {t.title}
                {t.dueDate ? `（期限: ${t.dueDate}）` : ''}
              </p>
            ))}
          </DashboardWidget>

          <DashboardWidget title="期限切れタスク" empty="ありません">
            {dashboard.overdueTasks.map((t) => (
              <p key={t.id} className="text-sm text-red-600">
                {t.title}（期限: {t.dueDate}）
              </p>
            ))}
          </DashboardWidget>

          <DashboardWidget title="近日中のミーティング" empty="ありません">
            {dashboard.upcomingMeetings.map((m) => (
              <p key={m.id} className="text-sm">
                {m.title}（{m.startAt}）
              </p>
            ))}
          </DashboardWidget>

          <DashboardWidget title="最近のアクティビティ" empty="ありません">
            {dashboard.recentActivity.map((l) => (
              <p key={l.id} className="text-sm">
                {l.action}（{l.targetType}）
              </p>
            ))}
          </DashboardWidget>
        </div>

        <CreateProjectForm />
      </main>
    </div>
  );
}
