import { ValidationError } from '@/lib/errors';
import type { ProjectMemberRole, ProjectStatus } from '@/lib/types';

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const VALID_STATUSES: ProjectStatus[] = [
  'active',
  'on_hold',
  'completed',
  'archived',
];
const VALID_MEMBER_ROLES: ProjectMemberRole[] = ['admin', 'member', 'guest'];

export interface ProjectCreateInput {
  name: string;
  description?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export function validateProjectCreate(input: ProjectCreateInput): void {
  if (!input.name || !input.name.trim()) {
    throw new ValidationError('プロジェクト名を入力してください', 'name');
  }
  if (input.name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(
      `プロジェクト名は${MAX_NAME_LENGTH}文字以内で入力してください`,
      'name'
    );
  }
  if (input.description && input.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(
      `説明文は${MAX_DESCRIPTION_LENGTH}文字以内で入力してください`,
      'description'
    );
  }
}

export function validateProjectUpdate(input: ProjectUpdateInput): void {
  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new ValidationError('プロジェクト名を入力してください', 'name');
    }
    if (input.name.length > MAX_NAME_LENGTH) {
      throw new ValidationError(
        `プロジェクト名は${MAX_NAME_LENGTH}文字以内で入力してください`,
        'name'
      );
    }
  }
  if (
    input.description !== undefined &&
    input.description.length > MAX_DESCRIPTION_LENGTH
  ) {
    throw new ValidationError(
      `説明文は${MAX_DESCRIPTION_LENGTH}文字以内で入力してください`,
      'description'
    );
  }
  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    throw new ValidationError('無効なステータスです', 'status');
  }
}

export function validateProjectMemberRole(role: string): ProjectMemberRole {
  if (!VALID_MEMBER_ROLES.includes(role as ProjectMemberRole)) {
    throw new ValidationError('無効なメンバーロールです', 'role');
  }
  return role as ProjectMemberRole;
}
