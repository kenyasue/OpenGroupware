import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import type { Locale, Theme } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Groupware',
  description: 'Project-based team collaboration tool',
  applicationName: 'Groupware',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Groupware',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2563eb',
};

function resolveTheme(v: string | undefined): Theme {
  return v === 'light' ? 'light' : 'dark'; // 既定は dark
}

function resolveLocale(v: string | undefined): Locale {
  return v === 'ja' ? 'ja' : 'en'; // 既定は en
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get('theme')?.value);
  const locale = resolveLocale(cookieStore.get('locale')?.value);

  return (
    <html
      lang={locale}
      className={theme === 'dark' ? 'dark' : ''}
      style={{ colorScheme: theme }}
    >
      <body>
        <I18nProvider initialLocale={locale} initialTheme={theme}>
          {children}
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
