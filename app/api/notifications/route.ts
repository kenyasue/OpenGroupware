import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createNotificationService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }

  const page = Number(request.nextUrl.searchParams.get('page') ?? '1') || 1;
  const service = createNotificationService();
  const result = service.listUnread(user.id, page);
  return NextResponse.json(result);
}
