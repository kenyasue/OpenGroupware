import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import {
  createScheduleService,
  createProjectService,
} from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { CalendarEventForm } from '@/components/calendar/CalendarEventForm';
import { CalendarView } from '@/components/calendar/CalendarView';
import {
  rangeForView,
  toISODate,
  parseISODate,
  type CalendarViewMode,
} from '@/lib/calendar/grid';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const VALID_VIEWS: CalendarViewMode[] = ['month', 'week', 'day'];

function isCalendarView(v: unknown): v is CalendarViewMode {
  return typeof v === 'string' && (VALID_VIEWS as string[]).includes(v);
}

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;
  const { view, date } = await searchParams;

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

  // 表示モードと基準日を解決(不正値はデフォルトへフォールバック)
  const resolvedView: CalendarViewMode = isCalendarView(view) ? view : 'month';
  const today = new Date();
  const anchor =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? parseISODate(date) : today;

  // ビューに応じた取得範囲を計算しイベントを取得。
  // アクセス権は getProject で参加確認済みなのでここでは再チェックしない。
  const range = rangeForView(resolvedView, anchor);
  const scheduleService = createScheduleService();
  const events = scheduleService.getCalendarEvents(user.id, project.id, range);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="calendar" />
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">カレンダー</h1>
        <CalendarEventForm
          projectId={project.id}
          defaultDate={toISODate(anchor)}
        />
        <CalendarView
          projectId={project.id}
          events={events}
          view={resolvedView}
          anchorDate={toISODate(anchor)}
          todayKey={toISODate(today)}
        />
      </main>
    </div>
  );
}
