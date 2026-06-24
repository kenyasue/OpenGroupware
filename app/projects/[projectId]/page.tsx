import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createProjectService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { DashboardWidget } from '@/components/project/DashboardWidget';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const { projectId } = await params;

  const service = createProjectService();
  let dashboard;
  try {
    dashboard = service.getDashboard(user.id, Number(projectId));
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect('/dashboard');
    }
    throw error;
  }

  const { project, members } = dashboard;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="overview" />
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
        </div>
        {project.description && (
          <p className="text-gray-600">{project.description}</p>
        )}
        <p className="text-sm text-gray-500">メンバー数: {members.length}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardWidget
            title="進行中ToDo"
            empty="ToDo機能は後続マイルストーンで実装されます"
          />
          <DashboardWidget
            title="最新チャット"
            empty="チャット機能は後続マイルストーンで実装されます"
          />
          <DashboardWidget
            title="最新掲示板"
            empty="掲示板機能は後続マイルストーンで実装されます"
          />
          <DashboardWidget
            title="最近のアクティビティ"
            empty="アクティビティログは後続マイルストーンで実装されます"
          />
        </div>
      </main>
    </div>
  );
}
