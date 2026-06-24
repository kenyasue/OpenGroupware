import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createNotificationService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { NotificationList } from '@/components/notifications/NotificationList';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const service = createNotificationService();
  const { items } = service.listUnread(user.id, 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">通知</h1>
        <NotificationList notifications={items} />
      </main>
    </div>
  );
}
