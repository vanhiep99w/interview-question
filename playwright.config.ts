import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:3107',
    browserName: 'chromium',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && node scripts/serve-test-site.mjs',
    url: 'http://127.0.0.1:3107/web/03-webpack-tu-source-den-trinh-duyet/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
