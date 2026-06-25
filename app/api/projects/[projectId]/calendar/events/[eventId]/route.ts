import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createScheduleService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; eventId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { eventId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }
  const service = createScheduleService();
  try {
    const event = service.updateEvent(user.id, Number(eventId), {
      title: typeof body.title === 'string' ? body.title : undefined,
      description:
        typeof body.description === 'string' ? body.description : undefined,
      startAt: typeof body.startAt === 'string' ? body.startAt : undefined,
      endAt:
        typeof body.endAt === 'string'
          ? body.endAt
          : body.endAt === null
            ? null
            : undefined,
    });
    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; eventId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { eventId } = await params;
  const service = createScheduleService();
  try {
    service.deleteEvent(user.id, Number(eventId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
