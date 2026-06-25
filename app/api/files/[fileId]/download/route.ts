import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createFileStorageService } from '@/lib/api/services';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { fileId } = await params;

  const service = createFileStorageService();
  try {
    const file = service.getFileInfo(user.id, Number(fileId));
    const body = fs.readFileSync(file.path);
    return new NextResponse(body, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `inline; filename="${file.originalName}"`,
        'Content-Length': String(file.size),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
