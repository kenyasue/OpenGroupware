import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createDashboardService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { CreateProjectForm } from '@/components/project/CreateProjectForm';
import { DashboardWidget } from '@/components/project/DashboardWidget';
import { getLocale, translate } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const service = createDashboardService();
  const dashboard = service.getPersonalDashboard(user.id);
  const locale = await getLocale();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={toPublicUser(user)} />
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">
          {translate('page.dashboard', locale)}
        </h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardWidget
            title={translate('dash.projects', locale)}
            empty={translate('dash.empty', locale)}
          >
            {dashboard.projects.map((p) => (
              <a
                key={p.id}
                href={`/projects/${p.id}`}
                className="block rounded border px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {p.name}（{p.status}）
              </a>
            ))}
          </DashboardWidget>

          <DashboardWidget
            title={`${translate('dash.unreadNotifications', locale)} (${dashboard.unreadNotificationCount})`}
            empty={translate('dash.noUnread', locale)}
          >
            <a
              href="/notifications"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {translate('dash.openNotifications', locale)}
            </a>
          </DashboardWidget>

          <DashboardWidget
            title={translate('dash.incompleteTodos', locale)}
            empty={translate('dash.empty', locale)}
          >
            {dashboard.incompleteTodos.map((t) => (
              <p key={t.id} className="text-sm">
                {t.title}
                {t.dueDate
                  ? `（${translate('dash.due', locale)}: ${t.dueDate}）`
                  : ''}
              </p>
            ))}
          </DashboardWidget>

          <DashboardWidget
            title={translate('dash.overdueTasks', locale)}
            empty={translate('dash.empty', locale)}
          >
            {dashboard.overdueTasks.map((t) => (
              <p key={t.id} className="text-sm text-red-600">
                {t.title}（{translate('dash.due', locale)}: {t.dueDate}）
              </p>
            ))}
          </DashboardWidget>

          <DashboardWidget
            title={translate('dash.upcomingMeetings', locale)}
            empty={translate('dash.empty', locale)}
          >
            {dashboard.upcomingMeetings.map((m) => (
              <p key={m.id} className="text-sm">
                {m.title}（{m.startAt}）
              </p>
            ))}
          </DashboardWidget>

          <DashboardWidget
            title={translate('dash.recentActivity', locale)}
            empty={translate('dash.empty', locale)}
          >
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
