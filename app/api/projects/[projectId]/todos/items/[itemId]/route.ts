import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createTodoService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { itemId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }
  const service = createTodoService();
  try {
    // complete は専用フラグでトグル、それ以外は通常更新
    if (body.toggleComplete === true) {
      const item = service.toggleComplete(user.id, Number(itemId));
      return NextResponse.json({ item });
    }
    if (body.columnId !== undefined && body.orderIndex !== undefined) {
      const item = service.moveItem(
        user.id,
        Number(itemId),
        Number(body.columnId),
        Number(body.orderIndex)
      );
      return NextResponse.json({ item });
    }
    const item = service.updateItem(user.id, Number(itemId), {
      title: typeof body.title === 'string' ? body.title : undefined,
      description:
        typeof body.description === 'string' ? body.description : undefined,
      assigneeId:
        body.assigneeId === null || body.assigneeId === undefined
          ? undefined
          : Number(body.assigneeId),
      priority:
        typeof body.priority === 'string'
          ? (body.priority as 'low' | 'normal' | 'high')
          : undefined,
      dueDate: typeof body.dueDate === 'string' ? body.dueDate : undefined,
      milestoneId:
        body.milestoneId === null || body.milestoneId === undefined
          ? undefined
          : Number(body.milestoneId),
    });
    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { itemId } = await params;
  const service = createTodoService();
  try {
    service.deleteItem(user.id, Number(itemId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
