import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import {
  createProjectService,
  createActivityLogService,
} from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }
  const { projectId } = await params;

  // メンバーシップ確認(非参加者は403)
  const projectService = createProjectService();
  try {
    projectService.getProject(user.id, Number(projectId));
  } catch (error) {
    return handleApiError(error);
  }

  const page = Number(request.nextUrl.searchParams.get('page') ?? '1') || 1;
  const activityService = createActivityLogService();
  const result = activityService.listByProject(Number(projectId), page);
  return NextResponse.json(result);
}
