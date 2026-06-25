import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createTodoService, createProjectService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { KanbanBoard } from '@/components/todo/KanbanBoard';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export default async function TodosPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;

  const projectService = createProjectService();
  let project: Awaited<ReturnType<typeof projectService.getProject>>;
  try {
    project = projectService.getProject(user.id, Number(projectId));
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect('/dashboard');
    }
    throw error;
  }

  const todoService = createTodoService();
  const columns = todoService.getColumns(user.id, project.id);
  const items = todoService.getItems(user.id, project.id);
  const members = projectService.getMembers(user.id, project.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="todos" />
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">ToDo / Kanban</h1>
        <KanbanBoard
          projectId={project.id}
          columns={columns}
          initialItems={items}
          members={members}
        />
      </main>
    </div>
  );
}
