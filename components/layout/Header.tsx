'use client';

import { useRouter } from 'next/navigation';
import type { PublicUser } from '@/lib/auth/getCurrentUser';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useI18n } from '@/lib/i18n/I18nProvider';

export function Header({ user }: { user: PublicUser }) {
  const router = useRouter();
  const { t } = useI18n();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
      <a
        href="/dashboard"
        className="font-bold text-gray-800 dark:text-gray-100"
      >
        {t('app.name')}
      </a>
      <nav className="flex items-center gap-4 text-sm">
        <a
          href="/dashboard"
          className="text-gray-600 hover:underline dark:text-gray-300"
        >
          {t('nav.dashboard')}
        </a>
        <ThemeToggle />
        <NotificationBadge />
        <a
          href="/profile"
          className="text-gray-600 hover:underline dark:text-gray-300"
        >
          {user.name}
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          {t('header.logout')}
        </button>
      </nav>
    </header>
  );
}
