import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createFileStorageService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { fileId } = await params;

  const service = createFileStorageService();
  try {
    service.delete(user.id, Number(fileId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
