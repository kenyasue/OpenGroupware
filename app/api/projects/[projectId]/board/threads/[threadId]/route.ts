import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createBoardService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; threadId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { threadId } = await params;

  const service = createBoardService();
  try {
    const thread = service.getThread(user.id, Number(threadId));
    const comments = service.listComments(user.id, Number(threadId));
    return NextResponse.json({ thread, comments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; threadId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { threadId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }

  const service = createBoardService();
  try {
    const thread = service.updateThread(user.id, Number(threadId), {
      title: typeof body.title === 'string' ? body.title : undefined,
      bodyMd: typeof body.bodyMd === 'string' ? body.bodyMd : undefined,
      category:
        typeof body.category === 'string'
          ? (body.category as never)
          : undefined,
      isPinned: typeof body.isPinned === 'number' ? body.isPinned : undefined,
      isImportant:
        typeof body.isImportant === 'number' ? body.isImportant : undefined,
    });
    return NextResponse.json({ thread });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; threadId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { threadId } = await params;

  const service = createBoardService();
  try {
    service.deleteThread(user.id, Number(threadId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
