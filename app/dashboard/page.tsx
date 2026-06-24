import { redirect } from 'next/navigation';
import { getCurrentUser, toPublicUser } from '@/lib/auth/getCurrentUser';
import { createProjectService } from '@/lib/api/services';
import { Header } from '@/components/layout/Header';
import { ProjectCard } from '@/components/project/ProjectCard';
import { CreateProjectForm } from '@/components/project/CreateProjectForm';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const service = createProjectService();
  const projects = service.getMyProjects(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={toPublicUser(user)} />
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <CreateProjectForm />
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            参加プロジェクト
          </h2>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-400">
              参加しているプロジェクトはありません。
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
