const NAV_ITEMS = [
  { href: '', label: '概要' },
  { href: '/members', label: 'メンバー' },
  { href: '/settings', label: '設定' },
] as const;

/**
 * プロジェクト内サブナビゲーション。
 * href は `/projects/{projectId}` を起点とする相対パス。
 */
export function ProjectNav({
  projectId,
  active,
}: {
  projectId: number;
  active: 'overview' | 'members' | 'settings';
}) {
  const activeMap: Record<string, boolean> = {
    overview: active === 'overview',
    members: active === 'members',
    settings: active === 'settings',
  };

  return (
    <nav className="flex gap-4 border-b bg-white px-6 py-2 text-sm">
      {NAV_ITEMS.map((item) => {
        const key = item.href === '' ? 'overview' : item.href.slice(1);
        const href = `/projects/${projectId}${item.href}`;
        return (
          <a
            key={item.href}
            href={href}
            className={
              activeMap[key]
                ? 'font-medium text-blue-600'
                : 'text-gray-600 hover:underline'
            }
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
