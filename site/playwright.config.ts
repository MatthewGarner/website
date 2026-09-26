import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:4335', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1200, height: 1000 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1200, height: 1000 } } },
  ],
  webServer: {
    command: 'node --import tsx scripts/browser-fixture.ts',
    url: 'http://127.0.0.1:4335',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
