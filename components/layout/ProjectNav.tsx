'use client';

import { useI18n } from '@/lib/i18n/I18nProvider';
import type { MessageKey } from '@/lib/i18n/dictionary';

const NAV_ITEMS: { href: string; key: MessageKey; activeKey: string }[] = [
  { href: '', key: 'nav.overview', activeKey: 'overview' },
  { href: '/board', key: 'nav.board', activeKey: 'board' },
  { href: '/notes', key: 'nav.notes', activeKey: 'notes' },
  { href: '/chat', key: 'nav.chat', activeKey: 'chat' },
  { href: '/todos', key: 'nav.todos', activeKey: 'todos' },
  { href: '/files', key: 'nav.files', activeKey: 'files' },
  { href: '/calendar', key: 'nav.calendar', activeKey: 'calendar' },
  { href: '/milestones', key: 'nav.milestones', activeKey: 'milestones' },
  { href: '/meetings', key: 'nav.meetings', activeKey: 'meetings' },
  { href: '/search', key: 'nav.search', activeKey: 'search' },
  { href: '/members', key: 'nav.members', activeKey: 'members' },
  { href: '/activity', key: 'nav.activity', activeKey: 'activity' },
  { href: '/settings', key: 'nav.settings', activeKey: 'settings' },
];

/**
 * プロジェクト内サブナビゲーション。
 * href は `/projects/{projectId}` を起点とする相対パス。
 */
export function ProjectNav({
  projectId,
  active,
}: {
  projectId: number;
  active:
    | 'overview'
    | 'board'
    | 'notes'
    | 'chat'
    | 'todos'
    | 'files'
    | 'calendar'
    | 'milestones'
    | 'meetings'
    | 'search'
    | 'members'
    | 'activity'
    | 'settings';
}) {
  const { t } = useI18n();

  return (
    <nav
      data-testid="project-nav"
      className="flex gap-4 overflow-x-auto whitespace-nowrap border-b bg-white px-6 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
    >
      {NAV_ITEMS.map((item) => {
        const href = `/projects/${projectId}${item.href}`;
        return (
          <a
            key={item.href}
            href={href}
            className={
              active === item.activeKey
                ? 'font-medium text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:underline dark:text-gray-300'
            }
          >
            {t(item.key)}
          </a>
        );
      })}
    </nav>
  );
}
