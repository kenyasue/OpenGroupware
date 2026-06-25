import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createScheduleService } from '@/lib/api/services';
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
  const service = createScheduleService();
  try {
    return NextResponse.json({
      milestones: service.getMilestones(user.id, Number(projectId)),
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
  const service = createScheduleService();
  try {
    const milestone = service.createMilestone(user.id, Number(projectId), {
      title: String(body.title ?? ''),
      dueDate: typeof body.dueDate === 'string' ? body.dueDate : null,
      description:
        typeof body.description === 'string' ? body.description : null,
    });
    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
