-- 002_attachments.sql
-- チャット/掲示板への添付ファイル関連付けテーブルと、file_assets の来源区分。

-- 11. attachments: メッセージ/スレッド/コメント と file_assets の多対多関連
CREATE TABLE attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES file_assets(id)
);

CREATE INDEX idx_attachments_target ON attachments(target_type, target_id);
CREATE INDEX idx_attachments_file ON attachments(file_id);

-- file_assets に source 列を追加(ライブラリ公開 vs 添付専用)。
-- 既存レコードは 'library' となり Files 一覧にそのまま表示される。
ALTER TABLE file_assets ADD COLUMN source TEXT NOT NULL DEFAULT 'library';
