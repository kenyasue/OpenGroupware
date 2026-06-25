'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';

export function CreateProjectForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || undefined }),
    });

    if (res.ok) {
      const data = (await res.json()) as { project: { id: number } };
      router.push(`/projects/${data.project.id}`);
      return;
    }

    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    setError(body?.error?.message ?? t('project.createFailed'));
    setLoading(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-lg border bg-white p-4 shadow-sm sm:flex-row sm:items-end dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex-1">
        <label htmlFor="project-name" className="block text-sm font-medium">
          {t('auth.projectName')}
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
          required
          maxLength={200}
        />
      </div>
      <div className="flex-1">
        <label
          htmlFor="project-description"
          className="block text-sm font-medium"
        >
          {t('project.description')}
        </label>
        <input
          id="project-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? t('project.creating') : t('auth.newProject')}
      </button>
      {error && (
        <p className="text-sm text-red-600 sm:full" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
