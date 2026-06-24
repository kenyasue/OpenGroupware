import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createProjectService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { AddMemberForm } from '@/components/project/AddMemberForm';
import { RemoveMemberButton } from '@/components/project/RemoveMemberButton';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ROLE_LABEL = { admin: '管理者', member: 'メンバー', guest: 'ゲスト' };

export default async function ProjectMembersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const { projectId } = await params;

  const service = createProjectService();
  let project: Awaited<ReturnType<typeof service.getProject>>;
  let members: Awaited<ReturnType<typeof service.getMembers>>;
  let canManage: boolean;
  try {
    project = service.getProject(user.id, Number(projectId));
    members = service.getMembers(user.id, Number(projectId));
    canManage = service.getMemberRole(user.id, Number(projectId)) === 'admin';
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect('/dashboard');
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="members" />
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">メンバー管理</h1>

        {canManage && <AddMemberForm projectId={project.id} />}

        <section className="rounded-lg border bg-white shadow-sm">
          <ul className="divide-y">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {member.user.name}
                    {member.userId === user.id && (
                      <span className="ml-2 text-xs text-gray-400">
                        (あなた)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {ROLE_LABEL[member.role] ?? member.role}
                  </span>
                  {canManage && member.userId !== user.id && (
                    <RemoveMemberButton
                      projectId={project.id}
                      userId={member.userId}
                      label="削除"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
