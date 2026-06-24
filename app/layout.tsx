import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'シンプルグループウェア',
  description:
    'プロジェクト単位で情報共有・タスク管理を行えるチームコラボレーションツール',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
