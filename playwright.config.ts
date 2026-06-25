import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  globalSetup: './tests/e2e/globalSetup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // E2Eは既存の日本語アサーションを維持するため既定で ja ロケールを使用。
    // (既定UIは en だが、テストは ja Cookie を与えて日本語表示を検証する)
    storageState: 'tests/e2e/locale-ja.json',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run migrate && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120 * 1000,
    env: { SESSION_SECRET: 'e2e-secret' },
  },
});
