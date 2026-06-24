// テスト実行時に必要な環境変数のデフォルトを設定する
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-secret';
