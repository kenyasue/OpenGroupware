import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createBoardService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { MarkdownBody } from '@/components/board/MarkdownBody';
import { CommentForm } from '@/components/board/CommentForm';
import { AttachmentList } from '@/components/files/AttachmentList';
import type { AttachmentView } from '@/lib/types';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; threadId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId, threadId } = await params;

  const boardService = createBoardService();
  let thread;
  let comments;
  let attachments: { thread: AttachmentView[]; comments: AttachmentView[] };
  try {
    thread = boardService.getThread(user.id, Number(threadId));
    comments = boardService.listComments(user.id, Number(threadId));
    attachments = boardService.getAttachments(
      user.id,
      thread.id,
      comments.items.map((c) => c.id)
    );
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect(`/projects/${projectId}/board`);
    }
    throw error;
  }

  // コメントIDごとに添付をグループ化
  const commentAttachments = new Map(
    attachments.comments.map((a) => [
      a.targetId,
      [] as typeof attachments.comments,
    ])
  );
  for (const a of attachments.comments) {
    const list = commentAttachments.get(a.targetId);
    if (list) list.push(a);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={Number(projectId)} active="board" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <a
          href={`/projects/${projectId}/board`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← 掲示板一覧へ
        </a>
        <div className="rounded-lg border bg-white dark:bg-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{thread.title}</h1>
            {thread.category && (
              <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
                {thread.category}
              </span>
            )}
          </div>
          <div className="mt-4">
            <MarkdownBody bodyMd={thread.bodyMd} />
          </div>
          {attachments.thread.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                添付ファイル
              </p>
              <AttachmentList attachments={attachments.thread} />
            </div>
          )}
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            投稿: {thread.createdAt} / 更新: {thread.updatedAt}
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-bold">コメント ({comments.total})</h2>
          {comments.items.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border bg-white dark:bg-gray-800 p-4 shadow-sm"
            >
              <MarkdownBody bodyMd={comment.bodyMd} />
              {commentAttachments.has(comment.id) &&
                commentAttachments.get(comment.id)!.length > 0 && (
                  <div className="mt-2">
                    <AttachmentList
                      attachments={commentAttachments.get(comment.id)!}
                    />
                  </div>
                )}
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                {comment.createdAt}
              </p>
            </div>
          ))}
          <CommentForm projectId={Number(projectId)} threadId={thread.id} />
        </section>
      </main>
    </div>
  );
}
