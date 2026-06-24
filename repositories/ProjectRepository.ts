import type { SqliteDatabase } from '@/lib/db/sqlite';
import type { Project, ProjectStatus } from '@/lib/types';

interface ProjectRow {
  id: number;
  name: string;
  description: string | null;
  status: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as ProjectStatus,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  ownerId: number;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
}

/**
 * projectsテーブルへのデータアクセスを担うRepository。
 */
export class ProjectRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findById(id: number): Project | null {
    const row = this.db.get<ProjectRow>(
      'SELECT * FROM projects WHERE id = @id',
      { id }
    );
    return row ? mapProject(row) : null;
  }

  findByOwner(ownerId: number): Project[] {
    const rows = this.db.query<ProjectRow>(
      'SELECT * FROM projects WHERE owner_id = @ownerId ORDER BY id',
      { ownerId }
    );
    return rows.map(mapProject);
  }

  /** ユーザーが参加しているプロジェクト一覧を取得する */
  findProjectsByUserId(userId: number): Project[] {
    const rows = this.db.query<ProjectRow>(
      `SELECT p.* FROM projects p
       INNER JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = @userId
       ORDER BY p.id`,
      { userId }
    );
    return rows.map(mapProject);
  }

  create(input: CreateProjectInput): Project {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO projects (name, description, status, owner_id, created_at, updated_at)
       VALUES (@name, @description, @status, @ownerId, @createdAt, @updatedAt)`,
      {
        name: input.name,
        description: input.description ?? null,
        status: 'active',
        ownerId: input.ownerId,
        createdAt: now,
        updatedAt: now,
      }
    );
    const created = this.findById(Number(result.lastInsertRowid));
    if (!created) {
      throw new Error('Failed to create project');
    }
    return created;
  }

  update(id: number, input: UpdateProjectInput): Project | null {
    const fields: string[] = ['updated_at = @updatedAt'];
    const params: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      id,
    };

    if (input.name !== undefined) {
      fields.push('name = @name');
      params.name = input.name;
    }
    if (input.description !== undefined) {
      fields.push('description = @description');
      params.description = input.description;
    }
    if (input.status !== undefined) {
      fields.push('status = @status');
      params.status = input.status;
    }

    this.db.execute(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = @id`,
      params
    );
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db.execute('DELETE FROM projects WHERE id = @id', {
      id,
    });
    return result.changes > 0;
  }
}
