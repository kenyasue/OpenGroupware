import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import {
  createScheduleService,
  createProjectService,
} from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { MilestoneForm } from '@/components/calendar/MilestoneForm';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

function progressColor(progress: number): string {
  if (progress >= 67) return 'bg-green-500';
  if (progress >= 34) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;

  const projectService = createProjectService();
  let project: Awaited<ReturnType<typeof projectService.getProject>>;
  try {
    project = projectService.getProject(user.id, Number(projectId));
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect('/dashboard');
    }
    throw error;
  }

  const scheduleService = createScheduleService();
  const milestones = scheduleService.getMilestones(user.id, project.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="milestones" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">マイルストーン</h1>
        <MilestoneForm projectId={project.id} />
        <section className="space-y-3">
          {milestones.length === 0 ? (
            <p className="text-sm text-gray-400">
              マイルストーンはありません。
            </p>
          ) : (
            milestones.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border bg-white p-4 shadow-sm"
                data-testid={`milestone-${m.id}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">{m.title}</h3>
                  <span className="text-xs text-gray-500">
                    {m.status}
                    {m.dueDate ? ` / 期限: ${m.dueDate}` : ''}
                  </span>
                </div>
                {m.description && (
                  <p className="mt-1 text-sm text-gray-600">{m.description}</p>
                )}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>進捗</span>
                    <span data-testid={`milestone-progress-${m.id}`}>
                      {m.progress}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded bg-gray-200">
                    <div
                      className={`h-2 rounded ${progressColor(m.progress)}`}
                      style={{ width: `${m.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
