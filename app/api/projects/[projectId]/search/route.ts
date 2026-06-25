import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createSearchService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { projectId } = await params;
  const q = request.nextUrl.searchParams.get('q') ?? '';
  const type = (request.nextUrl.searchParams.get('type') ?? undefined) as
    | string
    | undefined;

  const service = createSearchService();
  try {
    return NextResponse.json(
      service.search(user.id, Number(projectId), {
        q,
        type: type as never,
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}
