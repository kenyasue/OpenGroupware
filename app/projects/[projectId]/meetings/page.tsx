import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createMeetingService, createProjectService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { MeetingForm } from '@/components/meetings/MeetingForm';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export default async function MeetingsPage({
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

  const meetingService = createMeetingService();
  const meetings = meetingService.getMeetings(user.id, project.id);
  const members = projectService.getMembers(user.id, project.id).map((m) => ({
    userId: m.userId,
    name: m.user.name,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="meetings" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">ミーティング</h1>
        <MeetingForm projectId={project.id} members={members} />
        <section className="space-y-3">
          {meetings.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              ミーティングはありません。
            </p>
          ) : (
            meetings.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm"
                data-testid={`meeting-${m.id}`}
              >
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                  {m.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {m.startAt} 〜 {m.endAt}
                </p>
                {m.location && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    場所: {m.location}
                  </p>
                )}
                {m.minutesMd && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    議事録あり
                  </p>
                )}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
