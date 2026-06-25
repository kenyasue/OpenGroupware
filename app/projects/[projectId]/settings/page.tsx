import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createProjectService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { ProjectSettingsForm } from '@/components/project/ProjectSettingsForm';
import { DeleteProjectButton } from '@/components/project/DeleteProjectButton';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export default async function ProjectSettingsPage({
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
  let project;
  let canManage;
  try {
    project = service.getProject(user.id, Number(projectId));
    canManage = service.getMemberRole(user.id, Number(projectId)) === 'admin';
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect('/dashboard');
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="settings" />
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">プロジェクト設定</h1>
        <div className="rounded-lg border bg-white dark:bg-gray-800 p-6 shadow-sm">
          <ProjectSettingsForm project={project} canManage={canManage} />
        </div>
        {canManage && (
          <div className="rounded-lg border border-red-200 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-red-700">危険操作</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              プロジェクトを削除すると、関連データも削除されます。
            </p>
            <DeleteProjectButton projectId={project.id} />
          </div>
        )}
      </main>
    </div>
  );
}
