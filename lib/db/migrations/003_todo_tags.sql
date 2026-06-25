-- 003_todo_tags.sql
-- ToDoアイテムにタグ列を追加(カンマ区切り、project_notes.tags と同じ方式)。

ALTER TABLE todo_items ADD COLUMN tags TEXT;
