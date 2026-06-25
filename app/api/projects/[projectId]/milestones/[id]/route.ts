import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createScheduleService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }
  const service = createScheduleService();
  try {
    const milestone = service.updateMilestone(user.id, Number(id), {
      title: typeof body.title === 'string' ? body.title : undefined,
      dueDate:
        typeof body.dueDate === 'string'
          ? body.dueDate
          : body.dueDate === null
            ? null
            : undefined,
      status:
        typeof body.status === 'string'
          ? (body.status as 'open' | 'closed')
          : undefined,
      description:
        typeof body.description === 'string' ? body.description : undefined,
    });
    return NextResponse.json({ milestone });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { id } = await params;
  const service = createScheduleService();
  try {
    return NextResponse.json({
      progress: service.getMilestoneProgress(user.id, Number(id)),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
