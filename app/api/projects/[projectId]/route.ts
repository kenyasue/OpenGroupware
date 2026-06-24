import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createProjectService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }
  const { projectId } = await params;

  const service = createProjectService();
  try {
    const dashboard = service.getDashboard(user.id, Number(projectId));
    return NextResponse.json(dashboard);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }
  const { projectId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }

  const service = createProjectService();
  try {
    const project = service.updateProject(user.id, Number(projectId), {
      name: typeof body.name === 'string' ? body.name : undefined,
      description:
        typeof body.description === 'string' ? body.description : undefined,
      status:
        typeof body.status === 'string'
          ? (body.status as 'active' | 'on_hold' | 'completed' | 'archived')
          : undefined,
    });
    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }
  const { projectId } = await params;

  const service = createProjectService();
  try {
    service.deleteProject(user.id, Number(projectId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
