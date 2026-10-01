import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'ipad-touch', use: { viewport: { width: 1024, height: 1366 }, hasTouch: true } },
    { name: 'mobile-touch', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: { command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory out', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
