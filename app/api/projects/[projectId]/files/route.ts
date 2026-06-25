import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createFileStorageService } from '@/lib/api/services';
import { UnauthorizedError, ValidationError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { projectId } = await params;
  const page = Number(request.nextUrl.searchParams.get('page') ?? '1') || 1;
  const service = createFileStorageService();
  try {
    return NextResponse.json(
      service.listFiles(user.id, Number(projectId), page)
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { projectId } = await params;

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return handleApiError(
      new ValidationError('ファイルを指定してください', 'file')
    );
  }

  const data = Buffer.from(await file.arrayBuffer());
  const service = createFileStorageService();
  try {
    const fileAsset = service.upload(user.id, Number(projectId), {
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      data,
    });
    return NextResponse.json({ file: fileAsset }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
