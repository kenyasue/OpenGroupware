import type { Project } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-200 text-gray-700',
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <a
      href={`/projects/${project.id}`}
      className="block rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{project.name}</h3>
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {STATUS_LABELS[project.status] ?? project.status}
        </span>
      </div>
      {project.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">
          {project.description}
        </p>
      )}
    </a>
  );
}
