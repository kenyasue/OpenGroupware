/**
 * プロジェクトページ共通のサイドバー。
 * プロジェクト内ナビゲーションは ProjectNav に委譲する。
 */
export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside className="w-48 shrink-0 border-r bg-gray-50 p-4">{children}</aside>
  );
}
