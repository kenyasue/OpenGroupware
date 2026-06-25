import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createSearchService, createProjectService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { SearchForm } from '@/components/project/SearchForm';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const TYPE_LINKS: Record<string, (id: number, projectId: number) => string> = {
  thread: (id, p) => `/projects/${p}/board/${id}`,
  note: (id, p) => `/projects/${p}/notes/${id}`,
  todo: (_id, p) => `/projects/${p}/todos`,
  file: (id) => `/api/files/${id}/download`,
  event: (_id, p) => `/projects/${p}/calendar`,
  meeting: (_id, p) => `/projects/${p}/meetings`,
  milestone: (_id, p) => `/projects/${p}/milestones`,
  chat: (_id, p) => `/projects/${p}/chat`,
};

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;
  const { q, type } = await searchParams;

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

  const searchService = createSearchService();
  const results = q
    ? searchService.search(user.id, project.id, {
        q,
        type: type as never,
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="search" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">検索</h1>
        <SearchForm
          projectId={project.id}
          initialQ={q ?? ''}
          initialType={type ?? ''}
        />
        <section className="space-y-2">
          {q && results.length === 0 && (
            <p className="text-sm text-gray-400">該当する結果はありません。</p>
          )}
          {results.map((r) => {
            const href =
              TYPE_LINKS[r.type]?.(r.id, project.id) ??
              `/projects/${project.id}`;
            return (
              <a
                key={`${r.type}-${r.id}`}
                href={href}
                className="block rounded border bg-white p-3 shadow-sm hover:shadow-md"
                data-testid={`search-result-${r.type}-${r.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">{r.title}</span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                    {r.type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{r.snippet}</p>
              </a>
            );
          })}
        </section>
      </main>
    </div>
  );
}
