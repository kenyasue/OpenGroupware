import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <a href="/profile" className="text-sm text-blue-600 hover:underline">
            {user.name} さん
          </a>
        </div>
        <p className="mt-4 text-gray-600">
          プロジェクト機能は後続マイルストーンで実装されます。
        </p>
      </div>
    </main>
  );
}
