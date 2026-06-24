import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.{test,spec}.{ts,tsx}',
      'lib/**/*.{test,spec}.{ts,tsx}',
      'repositories/**/*.{test,spec}.{ts,tsx}',
      'services/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'tests/e2e/**',
      'node_modules/**',
      'dist/**',
      '.next/**',
      '**/node_modules/**',
    ],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['repositories/**', 'services/**'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        '.steering/**',
        'app/**',
        'components/**',
        '**/*.config.{ts,js,mjs}',
        '**/types/**',
        'tests/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
