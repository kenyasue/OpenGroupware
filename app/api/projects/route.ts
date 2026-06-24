import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createProjectService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError, jsonError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }
  const service = createProjectService();
  const projects = service.getMyProjects(user.id);
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'リクエスト本文が不正です');
  }

  const service = createProjectService();
  try {
    const project = service.createProject(user.id, {
      name: String(body.name ?? ''),
      description:
        typeof body.description === 'string' ? body.description : undefined,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
