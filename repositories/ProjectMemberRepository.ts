import type { SqliteDatabase } from '@/lib/db/sqlite';
import type {
  ProjectMember,
  ProjectMemberRole,
  User,
  UserRole,
  UserStatus,
} from '@/lib/types';

interface ProjectMemberRow {
  id: number;
  project_id: number;
  user_id: number;
  role: string;
  joined_at: string;
}

interface MemberWithUserRow extends ProjectMemberRow {
  name: string;
  email: string;
  avatar_url: string | null;
  user_role: string;
  user_status: string;
}

export interface ProjectMemberWithUser extends ProjectMember {
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl' | 'role' | 'status'>;
}

function mapMember(row: ProjectMemberRow): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role as ProjectMemberRole,
    joinedAt: row.joined_at,
  };
}

function mapMemberWithUser(row: MemberWithUserRow): ProjectMemberWithUser {
  return {
    ...mapMember(row),
    user: {
      id: row.user_id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
      role: row.user_role as UserRole,
      status: row.user_status as UserStatus,
    },
  };
}

/**
 * project_membersテーブルへのデータアクセスを担うRepository。
 */
export class ProjectMemberRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findByProject(projectId: number): ProjectMemberWithUser[] {
    const rows = this.db.query<MemberWithUserRow>(
      `SELECT pm.*, u.name, u.email, u.avatar_url, u.role AS user_role, u.status AS user_status
       FROM project_members pm
       INNER JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = @projectId
       ORDER BY pm.id`,
      { projectId }
    );
    return rows.map(mapMemberWithUser);
  }

  findByUser(userId: number): ProjectMember[] {
    const rows = this.db.query<ProjectMemberRow>(
      'SELECT * FROM project_members WHERE user_id = @userId ORDER BY id',
      { userId }
    );
    return rows.map(mapMember);
  }

  add(
    projectId: number,
    userId: number,
    role: ProjectMemberRole
  ): ProjectMember {
    const now = new Date().toISOString();
    const result = this.db.execute(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES (@projectId, @userId, @role, @joinedAt)`,
      { projectId, userId, role, joinedAt: now }
    );
    return {
      id: Number(result.lastInsertRowid),
      projectId,
      userId,
      role,
      joinedAt: now,
    };
  }

  remove(projectId: number, userId: number): boolean {
    const result = this.db.execute(
      'DELETE FROM project_members WHERE project_id = @projectId AND user_id = @userId',
      { projectId, userId }
    );
    return result.changes > 0;
  }

  isMember(projectId: number, userId: number): boolean {
    const row = this.db.get<{ id: number }>(
      'SELECT id FROM project_members WHERE project_id = @projectId AND user_id = @userId',
      { projectId, userId }
    );
    return row !== null;
  }

  getRole(projectId: number, userId: number): ProjectMemberRole | null {
    const row = this.db.get<{ role: string }>(
      'SELECT role FROM project_members WHERE project_id = @projectId AND user_id = @userId',
      { projectId, userId }
    );
    return row ? (row.role as ProjectMemberRole) : null;
  }
}
