import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createNoteService, createProjectService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { NoteForm } from '@/components/notes/NoteForm';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export default async function NotesPage({
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

  const noteService = createNoteService();
  const { items } = noteService.listNotes(user.id, project.id, {
    page: Number(page ?? '1') || 1,
    search: q,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="notes" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">Markdownメモ</h1>
        <NoteForm projectId={project.id} />
        <section className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400">メモはありません。</p>
          ) : (
            items.map((note) => (
              <a
                key={note.id}
                href={`/projects/${project.id}/notes/${note.id}`}
                className="block rounded-lg border bg-white p-4 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">
                    {note.isPinned === 1 && '📌 '}
                    {note.title}
                  </h3>
                  {note.tags && (
                    <span className="text-xs text-gray-500">{note.tags}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">{note.updatedAt}</p>
              </a>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
