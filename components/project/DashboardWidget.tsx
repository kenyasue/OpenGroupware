/**
 * ダッシュボードの各項目を表示するウィジェットコンテナ。
 * M4では骨組みのみ。全項目の集計は M13 で完成させる。
 */
export function DashboardWidget({
  title,
  children,
  empty,
}: {
  title: string;
  children?: React.ReactNode;
  empty?: string;
}) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      {children ? (
        <div className="space-y-2">{children}</div>
      ) : (
        <p className="text-sm text-gray-400">{empty ?? 'データがありません'}</p>
      )}
    </section>
  );
}
