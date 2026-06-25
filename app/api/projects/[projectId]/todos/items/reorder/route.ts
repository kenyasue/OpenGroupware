import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createTodoService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

/**
 * カラム内のアイテム順序を一括再採番する(同一カラムの並べ替え / 他カラムからの移動)。
 * body: { columnId: number, itemIds: number[] } —— itemIds の順序で orderIndex 0..n-1 を割り当てる。
 */
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

  const columnId = Number(body.columnId);
  const itemIds = Array.isArray(body.itemIds)
    ? body.itemIds
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [];

  const service = createTodoService();
  try {
    const items = service.reorderItems(
      user.id,
      Number(projectId),
      columnId,
      itemIds
    );
    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
