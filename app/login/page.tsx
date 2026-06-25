'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/I18nProvider';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint =
      mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload =
      mode === 'login' ? { email, password } : { name, email, password };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push('/dashboard');
      return;
    }

    const data = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    setError(data?.error?.message ?? t('auth.failed'));
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-2xl font-bold">
          {mode === 'login' ? t('auth.login') : t('auth.register')}
        </h1>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {mode === 'register' && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                {t('auth.displayName')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              {t('auth.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              {t('auth.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
              required
              minLength={8}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? t('auth.processing')
              : mode === 'login'
                ? t('auth.loginButton')
                : t('auth.registerButton')}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-blue-600 hover:underline dark:text-blue-400"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? t('auth.registerHere') : t('auth.backToLogin')}
        </button>
      </div>
    </main>
  );
}
