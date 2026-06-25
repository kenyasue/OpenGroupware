-- 004_user_prefs.sql
-- ユーザーごとのテーマ(dark/light)と言語(en/ja)設定を追加。

ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE users ADD COLUMN locale TEXT NOT NULL DEFAULT 'en';
