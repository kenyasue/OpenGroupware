import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createDashboardService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());

  const service = createDashboardService();
  try {
    return NextResponse.json(service.getPersonalDashboard(user.id));
  } catch (error) {
    return handleApiError(error);
  }
}
