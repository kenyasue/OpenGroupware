/**
 * 全Entity型定義・共有型
 * functional-design.md のデータモデルに対応。
 * タイムスタンプはISO8601文字列(TEXT)。真偽値はINTEGER(0/1)。
 */

// ===== 列挙型 =====

export type UserRole = 'system_admin' | 'project_admin' | 'member' | 'guest';
export type UserStatus = 'active' | 'inactive';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectMemberRole = 'admin' | 'member' | 'guest';
export type BoardCategory =
  | 'notice'
  | 'spec'
  | 'minutes'
  | 'question'
  | 'decision'
  | 'trouble'
  | 'memo';
export type TodoPriority = 'low' | 'normal' | 'high';
export type MilestoneStatus = 'open' | 'closed';
export type CalendarEventType =
  | 'meeting'
  | 'deadline'
  | 'milestone'
  | 'todo'
  | 'reminder'
  | 'custom';
export type MeetingMemberStatus = 'invited' | 'accepted' | 'declined';
export type NotificationType =
  | 'mention'
  | 'todo_assigned'
  | 'todo_due_soon'
  | 'meeting_invited'
  | 'board_commented'
  | 'project_added'
  | 'file_shared'
  | 'note_updated';

// ===== エンティティ =====

export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: ProjectMemberRole;
  joinedAt: string;
}

export interface BoardThread {
  id: number;
  projectId: number;
  title: string;
  bodyMd: string;
  authorId: number;
  category: BoardCategory | null;
  isPinned: number;
  isImportant: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BoardComment {
  id: number;
  threadId: number;
  authorId: number;
  bodyMd: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ChatMessage {
  id: number;
  projectId: number;
  authorId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface TodoColumn {
  id: number;
  projectId: number;
  name: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface TodoItem {
  id: number;
  projectId: number;
  columnId: number;
  title: string;
  description: string | null;
  assigneeId: number | null;
  creatorId: number;
  priority: TodoPriority;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  orderIndex: number;
  milestoneId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FileAsset {
  id: number;
  projectId: number;
  uploaderId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface ProjectNote {
  id: number;
  projectId: number;
  title: string;
  bodyMd: string;
  tags: string | null;
  isPinned: number;
  createdById: number;
  updatedById: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Milestone {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: MilestoneStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CalendarEvent {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  type: CalendarEventType;
  startAt: string;
  endAt: string | null;
  createdById: number;
  relatedTodoId: number | null;
  relatedMilestoneId: number | null;
  relatedMeetingId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Meeting {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  startAt: string;
  endAt: string;
  agendaMd: string | null;
  minutesMd: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MeetingMember {
  id: number;
  meetingId: number;
  userId: number;
  status: MeetingMemberStatus;
}

export interface Notification {
  id: number;
  userId: number;
  projectId: number | null;
  type: NotificationType;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  projectId: number;
  actorId: number;
  action: string;
  targetType: string;
  targetId: number | null;
  metadataJson: string | null;
  createdAt: string;
}

export interface SchemaMigration {
  id: number;
  filename: string;
  appliedAt: string;
}
