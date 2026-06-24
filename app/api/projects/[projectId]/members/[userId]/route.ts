import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createProjectService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; userId: string }>;
  }
) {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }
  const { projectId, userId } = await params;

  const service = createProjectService();
  try {
    service.removeMember(user.id, Number(projectId), Number(userId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
