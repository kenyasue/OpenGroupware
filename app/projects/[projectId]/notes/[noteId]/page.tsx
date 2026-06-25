import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createNoteService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { MarkdownBody } from '@/components/board/MarkdownBody';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import type { ProjectNote } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; noteId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId, noteId } = await params;

  const noteService = createNoteService();
  let note: ProjectNote;
  try {
    note = noteService.getNote(user.id, Number(noteId));
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect(`/projects/${projectId}/notes`);
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={Number(projectId)} active="notes" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <a
          href={`/projects/${projectId}/notes`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← メモ一覧へ
        </a>
        <div className="rounded-lg border bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            {note.isPinned === 1 && '📌 '}
            {note.title}
          </h1>
          {note.tags && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {note.tags}
            </p>
          )}
          <div className="mt-4">
            <MarkdownBody bodyMd={note.bodyMd} />
          </div>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            作成: {note.createdAt} / 更新: {note.updatedAt}
          </p>
        </div>
        <NoteEditor projectId={Number(projectId)} note={note} />
      </main>
    </div>
  );
}
