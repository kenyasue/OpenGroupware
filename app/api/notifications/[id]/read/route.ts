import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createNotificationService } from '@/lib/api/services';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }
  const { id } = await params;

  const service = createNotificationService();
  const updated = service.markRead(Number(id), user.id);
  if (!updated) {
    return handleApiError(new NotFoundError('Notification', id));
  }
  return NextResponse.json({ ok: true });
}
