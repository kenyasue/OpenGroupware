import type { MetadataRoute } from 'next';

/**
 * PWA マニフェスト。Next.js が /manifest.webmanifest を生成し、
 * <link rel="manifest"> を自動で <head> に出力する。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Groupware',
    short_name: 'Groupware',
    description: 'Project-based team collaboration tool',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#111827',
    theme_color: '#2563eb',
    lang: 'en',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
