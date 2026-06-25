import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createScheduleService } from '@/lib/api/services';
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
  const from = request.nextUrl.searchParams.get('from') ?? '';
  const to = request.nextUrl.searchParams.get('to') ?? '';
  const service = createScheduleService();
  try {
    return NextResponse.json(
      service.getCalendarEvents(user.id, Number(projectId), { from, to })
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
  const service = createScheduleService();
  try {
    const event = service.createEvent(user.id, {
      projectId: Number(projectId),
      title: String(body.title ?? ''),
      type: (typeof body.type === 'string' ? body.type : 'custom') as never,
      startAt: String(body.startAt ?? ''),
      endAt: typeof body.endAt === 'string' ? body.endAt : null,
      description:
        typeof body.description === 'string' ? body.description : null,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
