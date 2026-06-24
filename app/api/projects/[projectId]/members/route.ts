import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createProjectService, createUserRepository } from '@/lib/api/services';
import { validateProjectMemberRole } from '@/lib/validators/projectValidator';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';
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
    const members = service.getMembers(user.id, Number(projectId));
    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
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

  const email = String(body.email ?? '');
  const role = validateProjectMemberRole(
    typeof body.role === 'string' ? body.role : 'member'
  );

  // メールアドレスからユーザーを解決する
  const targetUser = createUserRepository().findByEmail(email);
  if (!targetUser) {
    return handleApiError(new NotFoundError('User', email));
  }

  const service = createProjectService();
  try {
    const member = service.addMember(
      user.id,
      Number(projectId),
      targetUser.id,
      role
    );
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
