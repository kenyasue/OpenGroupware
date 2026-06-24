import { NextResponse } from 'next/server';
import { AppError, ValidationError } from '@/lib/errors';

/**
 * Service層のエラーをHTTPエラーレスポンスに変換する。
 * 期待されるエラー(AppError)は対応するステータスコードへ、
 * 予期せぬエラーは500として内部情報を隠蔽する。
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    const body: { error: { message: string; field?: string } } = {
      error: { message: error.message },
    };
    if (error instanceof ValidationError && error.field) {
      body.error.field = error.field;
    }
    return NextResponse.json(body, { status: error.status });
  }
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: { message: '内部エラーが発生しました' } },
    { status: 500 }
  );
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: { message } }, { status });
}
