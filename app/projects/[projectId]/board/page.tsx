import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createBoardService, createProjectService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { ThreadForm } from '@/components/board/ThreadForm';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;
  const { q, page } = await searchParams;

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

  const boardService = createBoardService();
  const { items } = boardService.listThreads(user.id, project.id, {
    page: Number(page ?? '1') || 1,
    search: q,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="board" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">掲示板</h1>
        <ThreadForm projectId={project.id} />
        <section className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              スレッドはありません。
            </p>
          ) : (
            items.map((thread) => (
              <a
                key={thread.id}
                href={`/projects/${project.id}/board/${thread.id}`}
                className="block rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                    {thread.isPinned === 1 && '📌 '}
                    {thread.isImportant === 1 && '❗ '}
                    {thread.title}
                  </h3>
                  {thread.category && (
                    <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
                      {thread.category}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {thread.createdAt}
                </p>
              </a>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
