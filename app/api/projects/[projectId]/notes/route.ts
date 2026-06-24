import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createNoteService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { projectId } = await params;
  const page = Number(request.nextUrl.searchParams.get('page') ?? '1') || 1;
  const search = request.nextUrl.searchParams.get('q') ?? undefined;

  const service = createNoteService();
  try {
    return NextResponse.json(
      service.listNotes(user.id, Number(projectId), { page, search })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { projectId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }

  const service = createNoteService();
  try {
    const note = service.createNote(user.id, Number(projectId), {
      title: String(body.title ?? ''),
      bodyMd: String(body.bodyMd ?? ''),
      tags: typeof body.tags === 'string' ? body.tags : undefined,
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
