import { BoardRepository } from '@/repositories/BoardRepository';
import { ChatRepository } from '@/repositories/ChatRepository';
import { TodoRepository } from '@/repositories/TodoRepository';
import { FileRepository } from '@/repositories/FileRepository';
import { CalendarRepository } from '@/repositories/CalendarRepository';
import { MeetingRepository } from '@/repositories/MeetingRepository';
import { MilestoneRepository } from '@/repositories/MilestoneRepository';
import { ProjectNoteRepository } from '@/repositories/ProjectNoteRepository';
import { ProjectMemberRepository } from '@/repositories/ProjectMemberRepository';
import { ForbiddenError } from '@/lib/errors';

export type SearchResourceType =
  | 'thread'
  | 'chat'
  | 'todo'
  | 'file'
  | 'event'
  | 'meeting'
  | 'milestone'
  | 'note';

export interface SearchResult {
  type: SearchResourceType;
  id: number;
  title: string;
  snippet: string;
}

export interface SearchOptions {
  q: string;
  type?: SearchResourceType;
}

/**
 * プロジェクト内の横断検索を担うService。
 * 各リソースを取得しキーワードで絞り込む(小規模データ前提)。
 */
export class SearchService {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly chatRepository: ChatRepository,
    private readonly todoRepository: TodoRepository,
    private readonly fileRepository: FileRepository,
    private readonly calendarRepository: CalendarRepository,
    private readonly meetingRepository: MeetingRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly noteRepository: ProjectNoteRepository,
    private readonly projectMemberRepository: ProjectMemberRepository
  ) {}

  search(
    actorId: number,
    projectId: number,
    opts: SearchOptions
  ): SearchResult[] {
    this.requireMember(projectId, actorId);
    const q = opts.q.trim().toLowerCase();
    if (!q) return [];
    const type = opts.type;
    const results: SearchResult[] = [];
    const match = (text: string | null | undefined) =>
      !!text && text.toLowerCase().includes(q);

    if (!type || type === 'thread') {
      for (const t of this.boardRepository.findThreads(projectId).items) {
        if (match(t.title) || match(t.bodyMd)) {
          results.push({
            type: 'thread',
            id: t.id,
            title: t.title,
            snippet: t.bodyMd.slice(0, 80),
          });
        }
      }
    }
    if (!type || type === 'chat') {
      for (const m of this.chatRepository.findMessages(projectId).items) {
        if (match(m.body)) {
          results.push({
            type: 'chat',
            id: m.id,
            title: m.body.slice(0, 40),
            snippet: m.body.slice(0, 80),
          });
        }
      }
    }
    if (!type || type === 'todo') {
      for (const t of this.todoRepository.findItemsByProject(projectId)) {
        if (match(t.title) || match(t.description)) {
          results.push({
            type: 'todo',
            id: t.id,
            title: t.title,
            snippet: t.description?.slice(0, 80) ?? '',
          });
        }
      }
    }
    if (!type || type === 'file') {
      const files = this.fileRepository.findFilesByProject(
        projectId,
        1,
        500
      ).items;
      for (const f of files) {
        if (match(f.originalName)) {
          results.push({
            type: 'file',
            id: f.id,
            title: f.originalName,
            snippet: f.mimeType,
          });
        }
      }
    }
    if (!type || type === 'event') {
      for (const e of this.calendarRepository.findByProject(projectId)) {
        if (match(e.title) || match(e.description)) {
          results.push({
            type: 'event',
            id: e.id,
            title: e.title,
            snippet: e.description?.slice(0, 80) ?? '',
          });
        }
      }
    }
    if (!type || type === 'meeting') {
      for (const m of this.meetingRepository.findByProject(projectId)) {
        if (
          match(m.title) ||
          match(m.description) ||
          match(m.agendaMd) ||
          match(m.minutesMd)
        ) {
          results.push({
            type: 'meeting',
            id: m.id,
            title: m.title,
            snippet: m.description?.slice(0, 80) ?? '',
          });
        }
      }
    }
    if (!type || type === 'milestone') {
      for (const m of this.milestoneRepository.findByProject(projectId)) {
        if (match(m.title) || match(m.description)) {
          results.push({
            type: 'milestone',
            id: m.id,
            title: m.title,
            snippet: m.description?.slice(0, 80) ?? '',
          });
        }
      }
    }
    if (!type || type === 'note') {
      for (const n of this.noteRepository.findNotes(projectId).items) {
        if (match(n.title) || match(n.bodyMd) || match(n.tags)) {
          results.push({
            type: 'note',
            id: n.id,
            title: n.title,
            snippet: n.bodyMd.slice(0, 80),
          });
        }
      }
    }
    return results;
  }

  private requireMember(projectId: number, actorId: number): void {
    if (!this.projectMemberRepository.isMember(projectId, actorId)) {
      throw new ForbiddenError('プロジェクトに参加していません');
    }
  }
}
