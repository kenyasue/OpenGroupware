import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createBoardService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function POST(
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
    const comment = service.createComment(
      user.id,
      Number(threadId),
      String(body.bodyMd ?? '')
    );
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
