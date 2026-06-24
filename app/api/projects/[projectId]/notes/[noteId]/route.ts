import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createNoteService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { noteId } = await params;

  const service = createNoteService();
  try {
    const note = service.getNote(user.id, Number(noteId));
    return NextResponse.json({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { noteId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }

  const service = createNoteService();
  try {
    const note = service.updateNote(user.id, Number(noteId), {
      title: typeof body.title === 'string' ? body.title : undefined,
      bodyMd: typeof body.bodyMd === 'string' ? body.bodyMd : undefined,
      tags: typeof body.tags === 'string' ? body.tags : undefined,
      isPinned: typeof body.isPinned === 'number' ? body.isPinned : undefined,
    });
    return NextResponse.json({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { noteId } = await params;

  const service = createNoteService();
  try {
    service.deleteNote(user.id, Number(noteId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
