import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createBoardService } from '@/lib/api/services';
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

  const service = createBoardService();
  try {
    return NextResponse.json(
      service.listThreads(user.id, Number(projectId), { page, search })
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

  const service = createBoardService();
  try {
    const thread = service.createThread(user.id, Number(projectId), {
      title: String(body.title ?? ''),
      bodyMd: String(body.bodyMd ?? ''),
      category:
        typeof body.category === 'string'
          ? (body.category as never)
          : undefined,
    });
    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
