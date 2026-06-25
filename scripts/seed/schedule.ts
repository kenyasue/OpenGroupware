/**
 * スケジュール系エンティティの生成器(マイルストーン/ミーティング/カレンダー)。
 */
import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { MeetingMemberStatus, MilestoneStatus } from '@/lib/types';
import { chance, pick, pickN, randInt, seededUuid, type Rng } from './rng';
import { CALENDAR_TITLES, CALENDAR_TYPES, MEETING_TITLES } from './pools';
import { dayStr, daysFromNow, insert, now } from './helpers';

const MILESTONE_STATUS_OPEN: MilestoneStatus = 'open';
const MEETING_MEMBER_INVITED: MeetingMemberStatus = 'invited';

export function seedMilestones(
  db: SqliteDatabase,
  rng: Rng,
  projectId: number
): number[] {
  const ids: number[] = [];
  const phases = ['計画', '設計', '実装', 'テスト', 'リリース', '振り返り'];
  const count = randInt(rng, 2, 4);
  for (let i = 0; i < count; i++) {
    const id = insert(
      db,
      `INSERT INTO milestones (project_id, title, description, due_date, status, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @description, @dueDate, @status, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        title: `M${i + 1}: ${phases[i % phases.length]}完了`,
        description: 'マイルストーンです。',
        dueDate: dayStr(randInt(rng, 3, 60)),
        status: MILESTONE_STATUS_OPEN,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    ids.push(id);
  }
  return ids;
}

export function seedMeetings(
  db: SqliteDatabase,
  rng: Rng,
  projectId: number,
  creatorId: number,
  memberIds: number[]
): number[] {
  const ids: number[] = [];
  const count = randInt(rng, 1, 2);
  for (let i = 0; i < count; i++) {
    const offset = randInt(rng, -5, 30);
    const id = insert(
      db,
      `INSERT INTO meetings (project_id, title, description, location, meeting_url, start_at, end_at, agenda_md, minutes_md, created_by_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @description, @location, @meetingUrl, @startAt, @endAt, @agendaMd, @minutesMd, @createdById, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        title: pick(rng, MEETING_TITLES),
        description: '進捗確認と課題共有',
        location: pick(rng, [
          '会議室A',
          '会議室B',
          'オンライン',
          '会議室A / オンライン',
        ]),
        meetingUrl: chance(rng, 0.7)
          ? `https://meet.example.com/${seededUuid(rng).slice(0, 8)}`
          : null,
        startAt: daysFromNow(offset),
        endAt: daysFromNow(offset),
        agendaMd:
          '# アジェンダ\n\n1. 進捗共有\n2. ブロッカー確認\n3. 次週の計画',
        minutesMd: chance(rng, 0.6)
          ? '# 議事録\n\n- 進捗は順調\n- 課題を共有\n- 次週も継続'
          : null,
        createdById: creatorId,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    const attendeeCount = randInt(rng, 2, Math.max(2, memberIds.length));
    for (const uid of pickN(rng, memberIds, attendeeCount)) {
      insert(
        db,
        `INSERT INTO meeting_members (meeting_id, user_id, status)
         VALUES (@meetingId, @userId, @status)`,
        { meetingId: id, userId: uid, status: MEETING_MEMBER_INVITED }
      );
    }
    ids.push(id);
  }
  return ids;
}

export function seedCalendar(
  db: SqliteDatabase,
  rng: Rng,
  projectId: number,
  creatorId: number,
  todoIds: number[],
  milestoneIds: number[],
  meetingIds: number[]
): number[] {
  const ids: number[] = [];
  const count = randInt(rng, 3, 5);
  for (let i = 0; i < count; i++) {
    const type = pick(rng, CALENDAR_TYPES);
    const offset = randInt(rng, -7, 45);
    const id = insert(
      db,
      `INSERT INTO calendar_events (project_id, title, description, type, start_at, end_at, created_by_id, related_todo_id, related_milestone_id, related_meeting_id, created_at, updated_at, deleted_at)
       VALUES (@projectId, @title, @description, @type, @startAt, @endAt, @createdById, @relatedTodoId, @relatedMilestoneId, @relatedMeetingId, @createdAt, @updatedAt, NULL)`,
      {
        projectId,
        title: pick(rng, CALENDAR_TITLES),
        description: 'カレンダーイベントです。',
        type,
        startAt: type === 'deadline' ? dayStr(offset) : daysFromNow(offset),
        endAt: chance(rng, 0.4) ? daysFromNow(offset) : null,
        createdById: creatorId,
        relatedTodoId:
          chance(rng, 0.2) && todoIds.length > 0 ? pick(rng, todoIds) : null,
        relatedMilestoneId:
          chance(rng, 0.15) && milestoneIds.length > 0
            ? pick(rng, milestoneIds)
            : null,
        relatedMeetingId:
          chance(rng, 0.15) && meetingIds.length > 0
            ? pick(rng, meetingIds)
            : null,
        createdAt: now(),
        updatedAt: now(),
      }
    );
    ids.push(id);
  }
  return ids;
}
