import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createTodoService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { itemId } = await params;
  const service = createTodoService();
  try {
    const item = service.getItem(user.id, Number(itemId));
    const attachments = service.getItemAttachments(user.id, Number(itemId));
    return NextResponse.json({ item, attachments });
  } catch (error) {
    return handleApiError(error);
  }
}

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
    // nullable フィールドは absent(undefined=更新しない) と null(クリア) を区別する
    const nullableString = (v: unknown): string | null | undefined =>
      v === undefined ? undefined : v === null ? null : String(v);
    const nullableNumber = (v: unknown): number | null | undefined =>
      v === undefined ? undefined : v === null ? null : Number(v);

    const item = service.updateItem(user.id, Number(itemId), {
      title: typeof body.title === 'string' ? body.title : undefined,
      description: nullableString(body.description),
      assigneeId: nullableNumber(body.assigneeId),
      priority:
        typeof body.priority === 'string'
          ? (body.priority as 'low' | 'normal' | 'high')
          : undefined,
      startDate: nullableString(body.startDate),
      dueDate: nullableString(body.dueDate),
      tags: nullableString(body.tags),
      milestoneId: nullableNumber(body.milestoneId),
      fileIds: Array.isArray(body.fileIds)
        ? body.fileIds
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n) && n > 0)
        : undefined,
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
