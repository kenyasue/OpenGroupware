import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createMeetingService } from '@/lib/api/services';
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
  const service = createMeetingService();
  try {
    return NextResponse.json({
      meetings: service.getMeetings(user.id, Number(projectId)),
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
  const service = createMeetingService();
  try {
    const result = service.createMeeting(user.id, Number(projectId), {
      title: String(body.title ?? ''),
      startAt: String(body.startAt ?? ''),
      endAt: String(body.endAt ?? ''),
      description:
        typeof body.description === 'string' ? body.description : null,
      location: typeof body.location === 'string' ? body.location : null,
      meetingUrl: typeof body.meetingUrl === 'string' ? body.meetingUrl : null,
      agendaMd: typeof body.agendaMd === 'string' ? body.agendaMd : null,
      memberIds: Array.isArray(body.memberIds)
        ? body.memberIds.map(Number)
        : [],
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
