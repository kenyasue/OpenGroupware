import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createMeetingService } from '@/lib/api/services';
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
  const service = createMeetingService();
  try {
    if (body.minutesMd !== undefined) {
      const meeting = service.updateMinutes(
        user.id,
        Number(id),
        String(body.minutesMd ?? '')
      );
      return NextResponse.json({ meeting });
    }
    const meeting = service.updateMeeting(user.id, Number(id), {
      title: typeof body.title === 'string' ? body.title : undefined,
      startAt: typeof body.startAt === 'string' ? body.startAt : undefined,
      endAt: typeof body.endAt === 'string' ? body.endAt : undefined,
      agendaMd: typeof body.agendaMd === 'string' ? body.agendaMd : undefined,
      description:
        typeof body.description === 'string' ? body.description : undefined,
    });
    return NextResponse.json({ meeting });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  // /api/projects/:projectId/meetings/check は専用ルートで処理するが、
  // ここでは meetingId='check' の場合は重複チェックのみを行う
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { projectId, id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }
  const service = createMeetingService();
  try {
    const conflicts = service.checkScheduleConflicts(
      Number(projectId),
      Array.isArray(body.memberIds) ? body.memberIds.map(Number) : [],
      String(body.startAt ?? ''),
      String(body.endAt ?? ''),
      id === 'check' ? undefined : Number(id)
    );
    return NextResponse.json({ conflicts });
  } catch (error) {
    return handleApiError(error);
  }
}
