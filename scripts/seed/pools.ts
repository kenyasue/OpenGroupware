/**
 * シードデータ用のコンテンツプールとテキスト生成ヘルパ。
 * lib/types/index.ts の列挙型に合わせた値のみを使用する。
 */
import type {
  BoardCategory,
  CalendarEventType,
  NotificationType,
  TodoPriority,
} from '@/lib/types';
import { type Rng, chance, pick, pickN, randInt } from './rng';

export const GIVEN_NAMES = [
  'Frank',
  'Grace',
  'Henry',
  'Ivy',
  'Jack',
  'Karen',
  'Leo',
  'Mia',
  'Noah',
  'Olivia',
  'Peter',
  'Quinn',
  'Rachel',
  'Sam',
  'Tina',
  'Uma',
  'Victor',
  'Wendy',
  'Xander',
  'Yuki',
  'Zoe',
  'Amber',
  'Brian',
  'Chloe',
  'Diego',
  'Emma',
  'Finn',
  'Gina',
  'Hiro',
  'Iris',
  'Jonas',
  'Kira',
];

export const FAMILY_NAMES = [
  'Yamamoto',
  'Watanabe',
  'Ito',
  'Nakamura',
  'Kobayashi',
  'Saito',
  'Takahashi',
  'Kato',
  'Yoshida',
  'Sasaki',
  'Matsumoto',
  'Inoue',
  'Kimura',
  'Hayashi',
  'Shimizu',
  'Yamazaki',
  'Mori',
  'Abe',
  'Ikeda',
  'Hashimoto',
  'Yamaguchi',
  'Kondo',
  'Ishikawa',
  'Ogawa',
];

export const PROJECT_NAMES = [
  'Website Redesign',
  'Mobile App v2',
  'Marketing Campaign Q4',
  'Data Warehouse Migration',
  'Security Audit 2026',
  'HR Portal Revamp',
  'Customer Support Bot',
  'API Gateway Upgrade',
  'Design System 2.0',
  'Sales CRM Integration',
  'Cloud Cost Optimization',
  'Accessibility Audit',
  'Onboarding Flow Redesign',
  'Analytics Dashboard',
  'DevOps Automation',
  'Internal Wiki Migration',
  'Payment Gateway v3',
  'QA Automation Suite',
];

export const PROJECT_DESCRIPTIONS = [
  'コーポレートサイトの全面リニューアルプロジェクト',
  'iOS/Androidアプリの次期メジャーバージョン開発',
  '第4四半期マーケティングキャンペーンの企画・実行',
  'レガシーDWHからモダンデータプラットフォームへの移行',
  '全社システムのセキュリティ監査と是正',
  '人事ポータルのUX改善と再構築',
  'カスタマーサポート向けチャットボットの開発',
  'APIゲートウェイの刷新とレートリミット強化',
  '組織横断デザインシステムの次世代化',
  '営業CRMと社内DBの双方向連携',
  'クラウド利用コストの可視化と削減',
  '製品アクセシビリティの監査と改善',
  '新規ユーザーオンボーディングフローの再設計',
  '経営ダッシュボードの構築とBI連携',
  'デプロイパイプラインの自動化とCI/CD強化',
  '社内Wikiの新プラットフォームへの移行',
  '決済ゲートウェイの次期バージョン開発',
  '回帰テストの自動化とカバレッジ向上',
];

export const TODO_TITLES = [
  '要件定義',
  'ワイヤフレーム作成',
  'デザインモックアップ',
  'フロントエンド実装',
  'バックエンドAPI実装',
  'DBスキーマ設計',
  'ユニットテスト追加',
  'E2Eテスト作成',
  'パフォーマンス計測',
  'セキュリティレビュー',
  'アクセシビリティ確認',
  'ドキュメント整備',
  'デプロイ手順策定',
  'ロールバック確認',
  '負荷テスト',
  'ログ監視設定',
  'エラーハンドリング整理',
  'i18n対応',
  'ダッシュボード実装',
  '検索機能実装',
  '認証フロー見直し',
  'キャッシュ導入',
  'マニュアル作成',
  'レビュー対応',
  'リファクタリング',
  '依存ライブラリ更新',
  '本番環境検証',
  '顧客デモ準備',
  'マイルストーン調整',
  'バグトリアージ',
  'データ移行スクリプト',
  'バッチジョブ実装',
  'Webhook連携',
  'レポート出力',
  '権限設定見直し',
];

export const TODO_PRIORITIES: readonly TodoPriority[] = [
  'low',
  'normal',
  'high',
];

export const NOTE_TITLES = [
  'ミーティングメモ',
  '技術メモ',
  'アイデア',
  '議事録',
  '振り返り',
  '調査メモ',
  '設計メモ',
  'QAメモ',
  'リリースノート案',
  'トラブル対応記録',
  'ブレスト',
  '意思決定ログ',
  'タスク洗い出し',
  'インシデント報告',
  '週報',
];

export const NOTE_TAGS = [
  'meeting',
  'tech',
  'design',
  'qa',
  'release',
  'idea',
  'incident',
  'weekly',
  null,
];

export const CHAT_PHRASES = [
  'おはようございます！',
  'お疲れ様です。',
  '進捗どうですか？',
  '確認お願いします。',
  'ちょっと相談があります。',
  '了解しました。',
  'ありがとうございます！',
  '後で見ます。',
  'LGTMです。',
  'ブロッカー発生しました。',
  '修正しました。レビューお願いします。',
  'ミーティングの時間変更できますか？',
  '資料を共有します。',
  'いいですね！進めましょう。',
  '懸念点をまとめました。',
  'デプロイ完了しました。',
  'テスト通りました。',
  'バグを見つけました。',
  '仕様を再確認しましょう。',
  '承知しました。',
];

export const BOARD_TITLES = [
  'デザイン方針について',
  '週次進捗報告',
  'FAQ: ログインできない',
  'リリース計画の共有',
  'アーキテクチャレビュー',
  'スプリント振り返り',
  '新メンバーへのお知らせ',
  'トラブルシューティング',
  '意思決定記録',
  'テスト戦略',
  'パフォーマンス改善案',
  'セキュリティアップデート',
  '顧客フィードバックまとめ',
  'ドキュメント整理',
  '次フェーズの構想',
];

export const BOARD_CATEGORIES: readonly BoardCategory[] = [
  'notice',
  'spec',
  'minutes',
  'question',
  'decision',
  'trouble',
  'memo',
];

export const CALENDAR_TITLES = [
  '定例ミーティング',
  'デザインレビュー',
  'リリース締切',
  'スプリント計画',
  '振り返り',
  '1on1',
  '全社朝会',
  '顧客デモ',
  '技術共有会',
  '勉強会',
  '保守ウィンドウ',
  'デプロイ',
  'テスト実施日',
  'キックオフ',
  '回顧展示',
];

export const CALENDAR_TYPES: readonly CalendarEventType[] = [
  'meeting',
  'deadline',
  'milestone',
  'todo',
  'reminder',
  'custom',
];

export const MEETING_TITLES = [
  '週次定例ミーティング',
  '設計レビュー会',
  'スプリント計画会',
  'リリース判定会',
  '障害対応ブリーフィング',
];

export const NOTIF_TEMPLATES: {
  type: NotificationType;
  title: string;
  body: string;
}[] = [
  {
    type: 'mention',
    title: 'メンションされました',
    body: 'チャットでメンションされました',
  },
  {
    type: 'todo_assigned',
    title: 'ToDoが割り当てられました',
    body: '新しいタスクが担当になりました',
  },
  {
    type: 'todo_due_soon',
    title: '期限が近づいています',
    body: 'ToDoの期限が迫っています',
  },
  {
    type: 'meeting_invited',
    title: 'ミーティングに招待されました',
    body: 'カレンダーを確認してください',
  },
  {
    type: 'board_commented',
    title: '掲示板に返信がありました',
    body: 'あなたのスレッドにコメントがつきました',
  },
  {
    type: 'project_added',
    title: 'プロジェクトに追加されました',
    body: '新しいプロジェクトのメンバーになりました',
  },
  {
    type: 'file_shared',
    title: 'ファイルが共有されました',
    body: '新しいファイルがアップロードされました',
  },
  {
    type: 'note_updated',
    title: 'メモが更新されました',
    body: '担当メモが更新されました',
  },
];

export const ACTIVITY_ACTIONS: { action: string; targetType: string }[] = [
  { action: 'board_posted', targetType: 'thread' },
  { action: 'comment_added', targetType: 'comment' },
  { action: 'todo_created', targetType: 'todo' },
  { action: 'todo_updated', targetType: 'todo' },
  { action: 'todo_completed', targetType: 'todo' },
  { action: 'file_uploaded', targetType: 'file' },
  { action: 'note_created', targetType: 'note' },
  { action: 'note_updated', targetType: 'note' },
  { action: 'meeting_created', targetType: 'meeting' },
  { action: 'milestone_updated', targetType: 'milestone' },
];

const SENTENCES = [
  '今週は計画通りに進捗した。',
  'いくつかのブロッカーを解消した。',
  '次フェーズのスコープを確定した。',
  'レビューで指摘事項を整理した。',
  'パフォーマンス測定を実施した。',
  'ドキュメントを最新化した。',
  'テストカバレッジを改善した。',
  '依存ライブラリを更新した。',
  '顧客からのフィードバックを反映した。',
  'インフラ構成を見直した。',
];

const SECTIONS = ['概要', '背景', '決定事項', '宿題', '次のステップ'];

export function sentence(rng: Rng): string {
  return pick(rng, SENTENCES);
}

export function paragraph(rng: Rng, n: number): string {
  return pickN(rng, SENTENCES, n).join(' ');
}

export function markdownBody(rng: Rng, heading: string): string {
  const lines: string[] = [`# ${heading}`, ''];
  const sectionCount = randInt(rng, 2, 4);
  const sections = pickN(rng, SECTIONS, sectionCount);
  for (const s of sections) {
    lines.push(`## ${s}`, '');
    lines.push(paragraph(rng, randInt(rng, 2, 3)));
    if (chance(rng, 0.4)) {
      lines.push('');
      lines.push('- 項目A', '- 項目B', '- 項目C');
    }
    lines.push('');
  }
  return lines.join('\n');
}
