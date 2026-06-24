import path from 'node:path';
import { NextResponse } from 'next/server';
import { Migrator } from '@/lib/db/migrator';
import { getDb } from '@/lib/db/sqlite';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return handleApiError(new UnauthorizedError());
  }
  if (user.role !== 'system_admin') {
    return handleApiError(new ForbiddenError('管理者のみアクセス可能です'));
  }

  try {
    const migrationsDir = path.join(process.cwd(), 'lib', 'db', 'migrations');
    const migrator = new Migrator(getDb(), migrationsDir);
    return NextResponse.json({ migrations: migrator.getAppliedMigrations() });
  } catch (error) {
    return handleApiError(error);
  }
}
