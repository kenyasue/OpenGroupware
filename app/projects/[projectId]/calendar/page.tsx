import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import {
  createScheduleService,
  createProjectService,
} from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { CalendarEventForm } from '@/components/calendar/CalendarEventForm';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const SOURCE_COLORS: Record<string, string> = {
  event: 'bg-blue-100 text-blue-700',
  milestone: 'bg-purple-100 text-purple-700',
  todo: 'bg-yellow-100 text-yellow-700',
};

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;
  const { from, to } = await searchParams;

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

  // デフォルトは当月
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const rangeFrom = from ?? defaultFrom;
  const rangeTo = to ?? defaultFrom.replace(/-01$/, '-28');

  const scheduleService = createScheduleService();
  const events = scheduleService.getCalendarEvents(user.id, project.id, {
    from: rangeFrom,
    to: rangeTo,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="calendar" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">カレンダー</h1>
        <p className="text-sm text-gray-500">
          期間: {rangeFrom} 〜 {rangeTo}
        </p>
        <CalendarEventForm projectId={project.id} defaultDate={defaultFrom} />
        <section className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-gray-400">
              期間内のイベントはありません。
            </p>
          ) : (
            events.map((e) => (
              <div
                key={e.key}
                className="flex items-center justify-between rounded border bg-white p-3 shadow-sm"
                data-testid={`calendar-event-${e.key}`}
              >
                <div>
                  <p className="font-medium text-gray-800">{e.title}</p>
                  <p className="text-xs text-gray-400">{e.startAt}</p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    SOURCE_COLORS[e.source] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {e.source}
                </span>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
