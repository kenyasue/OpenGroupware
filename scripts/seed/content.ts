/**
 * プロジェクト単位のコンテンツ生成器(掲示板/チャット/ToDo/メモ/ファイル)。
 * いずれもFK順を担保し、挿入した実IDを呼び出し側へ返す。
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SqliteDatabase } from '@/lib/db/sqlite';
import { chance, pick, randInt, seededUuid, type Rng } from './rng';
import {
  BOARD_CATEGORIES,
  BOARD_TITLES,
  CHAT_PHRASES,
  NOTE_TAGS,
  NOTE_TITLES,
  TODO_PRIORITIES,
  TODO_TITLES,
  markdownBody,
  sentence,
} from './pools';
import { PNG_BYTES, dayStr, insert, now } from './helpers';

export function seedBoard(
  db: SqliteDatabase,
  rng: Rng,
  projectId: number,
  memberIds: number[]
): { threadIds: number[]; commentIds: number[] } {
  const threadIds: number[] = [];
  const commentIds: number[] = [];
  const count = randInt(rng, 3, 5);
  for (let i = 0; i < count; i++) {
    const title = pick(rng, BOARD_TITLES);
    const threadId = insert(
      db,
      `INSERT INTO board_threads (project_id, title, body_md, author_id, category, is_pinned, is_important, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @bodyMd, @authorId, @category, @isPinned, @isImportant, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        title,
        bodyMd: markdownBody(rng, title),
        authorId: pick(rng, memberIds),
        category: pick(rng, BOARD_CATEGORIES),
        isPinned: chance(rng, 0.15) ? 1 : 0,
        isImportant: chance(rng, 0.2) ? 1 : 0,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    threadIds.push(threadId);
    const commentCount = randInt(rng, 0, 2);
    for (let c = 0; c < commentCount; c++) {
      const cid = insert(
        db,
        `INSERT INTO board_comments (thread_id, author_id, body_md, created_at, updated_at, deleted_at)
         VALUES (@threadId, @authorId, @bodyMd, @createdAt, @updatedAt, NULL)`,
        {
          threadId,
          authorId: pick(rng, memberIds),
          bodyMd: pick(rng, CHAT_PHRASES),
          createdAt: now(),
          updatedAt: now(),
        }
      );
      commentIds.push(cid);
    }
  }
  return { threadIds, commentIds };
}

export function seedChat(
  db: SqliteDatabase,
  rng: Rng,
  projectId: number,
  memberIds: number[]
): number[] {
  const ids: number[] = [];
  const count = randInt(rng, 5, 8);
  for (let i = 0; i < count; i++) {
    const id = insert(
      db,
      `INSERT INTO chat_messages (project_id, author_id, body, created_at, updated_at, deleted_at)
       VALUES (@projectId, @authorId, @body, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        authorId: pick(rng, memberIds),
        body: pick(rng, CHAT_PHRASES),
        createdAt: now(),
        updatedAt: now(),
      }
    );
    ids.push(id);
  }
  return ids;
}

export function seedTodos(
  db: SqliteDatabase,
  rng: Rng,
  projectId: number,
  memberIds: number[],
  milestoneIds: number[]
): number[] {
  const columns = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
  const colIds = columns.map((name, idx) =>
    insert(
      db,
      `INSERT INTO todo_columns (project_id, name, order_index, created_at, updated_at)
       VALUES (@projectId, @name, @orderIndex, @createdAt, @updatedAt)`,
      { projectId, name, orderIndex: idx, createdAt: now(), updatedAt: now() }
    )
  );
  const ids: number[] = [];
  const count = randInt(rng, 7, 10);
  for (let i = 0; i < count; i++) {
    const colIdx = randInt(rng, 0, columns.length - 1);
    const completed = colIdx === columns.length - 1;
    const id = insert(
      db,
      `INSERT INTO todo_items (project_id, column_id, title, description, assignee_id, creator_id, priority, start_date, due_date, completed_at, order_index, milestone_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @columnId, @title, @description, @assigneeId, @creatorId, @priority, NULL, @dueDate, @completedAt, @orderIndex, @milestoneId, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        columnId: colIds[colIdx]!,
        title: pick(rng, TODO_TITLES),
        description: 'デモ用タスクです。',
        assigneeId: chance(rng, 0.8) ? pick(rng, memberIds) : null,
        creatorId: memberIds[0]!,
        priority: pick(rng, TODO_PRIORITIES),
        dueDate: chance(rng, 0.7) ? dayStr(randInt(rng, -10, 30)) : null,
        completedAt: completed ? now() : null,
        orderIndex: i,
        milestoneId:
          chance(rng, 0.6) && milestoneIds.length > 0
            ? pick(rng, milestoneIds)
            : null,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    ids.push(id);
  }
  return ids;
}

export function seedNotes(
  db: SqliteDatabase,
  rng: Rng,
  projectId: number,
  memberIds: number[]
): number[] {
  const ids: number[] = [];
  const count = randInt(rng, 3, 5);
  for (let i = 0; i < count; i++) {
    const authorId = pick(rng, memberIds);
    const title = pick(rng, NOTE_TITLES);
    const id = insert(
      db,
      `INSERT INTO project_notes (project_id, title, body_md, tags, is_pinned, created_by_id, updated_by_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @bodyMd, @tags, @isPinned, @createdById, @updatedById, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        title,
        bodyMd: markdownBody(rng, title),
        tags: pick(rng, NOTE_TAGS),
        isPinned: chance(rng, 0.2) ? 1 : 0,
        createdById: authorId,
        updatedById: authorId,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    ids.push(id);
  }
  return ids;
}

export function seedFiles(
  db: SqliteDatabase,
  rng: Rng,
  projectId: number,
  uploaderId: number,
  uploadsDir: string
): number[] {
  const dir = path.join(uploadsDir, String(projectId));
  fs.mkdirSync(dir, { recursive: true });
  const ids: number[] = [];
  const count = randInt(rng, 2, 4);
  for (let i = 0; i < count; i++) {
    if (chance(rng, 0.5)) {
      const filename = `${seededUuid(rng)}.png`;
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, PNG_BYTES);
      const id = insert(
        db,
        `INSERT INTO file_assets (project_id, uploader_id, filename, original_name, mime_type, size, path, created_at, deleted_at)
         VALUES (@projectId, @uploaderId, @filename, @originalName, @mimeType, @size, @path, @createdAt, NULL)`,
        {
          projectId,
          uploaderId,
          filename,
          originalName: `diagram-${i + 1}.png`,
          mimeType: 'image/png',
          size: PNG_BYTES.length,
          path: filePath,
          createdAt: now(),
        }
      );
      ids.push(id);
    } else {
      const filename = `${seededUuid(rng)}.txt`;
      const filePath = path.join(dir, filename);
      const content = `デモ用テキストファイル ${i + 1}。\n${sentence(rng)}`;
      fs.writeFileSync(filePath, content, 'utf-8');
      const id = insert(
        db,
        `INSERT INTO file_assets (project_id, uploader_id, filename, original_name, mime_type, size, path, created_at, deleted_at)
         VALUES (@projectId, @uploaderId, @filename, @originalName, @mimeType, @size, @path, @createdAt, NULL)`,
        {
          projectId,
          uploaderId,
          filename,
          originalName: `notes-${i + 1}.txt`,
          mimeType: 'text/plain',
          size: Buffer.byteLength(content),
          path: filePath,
          createdAt: now(),
        }
      );
      ids.push(id);
    }
  }
  return ids;
}
