import { ValidationError } from '@/lib/errors';
import type { ProjectStatus } from '@/lib/types';

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const VALID_STATUSES: ProjectStatus[] = [
  'active',
  'on_hold',
  'completed',
  'archived',
];

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
