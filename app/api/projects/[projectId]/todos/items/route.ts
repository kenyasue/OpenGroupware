import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createTodoService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { projectId } = await params;
  const service = createTodoService();
  try {
    return NextResponse.json({
      items: service.getItems(user.id, Number(projectId)),
    });
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
  const service = createTodoService();
  try {
    const item = service.createItem(user.id, Number(projectId), {
      title: String(body.title ?? ''),
      columnId: Number(body.columnId ?? 0),
      description:
        typeof body.description === 'string' ? body.description : undefined,
      assigneeId:
        body.assigneeId === null || body.assigneeId === undefined
          ? null
          : Number(body.assigneeId),
      priority:
        typeof body.priority === 'string'
          ? (body.priority as 'low' | 'normal' | 'high')
          : undefined,
      dueDate: typeof body.dueDate === 'string' ? body.dueDate : null,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
