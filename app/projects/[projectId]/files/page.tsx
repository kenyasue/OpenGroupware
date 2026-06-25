import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import {
  createFileStorageService,
  createProjectService,
} from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectNav } from '@/components/layout/ProjectNav';
import { Uploader } from '@/components/files/Uploader';
import { FileList } from '@/components/files/FileList';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export default async function FilesPage({
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

  const fileService = createFileStorageService();
  const { items } = fileService.listFiles(user.id, project.id);
  const canDelete =
    projectService.getMemberRole(user.id, project.id) === 'admin' ||
    items.some((f) => f.uploaderId === user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <ProjectNav projectId={project.id} active="files" />
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">ファイル</h1>
        <Uploader projectId={project.id} />
        <FileList files={items} canDelete={canDelete} />
      </main>
    </div>
  );
}
