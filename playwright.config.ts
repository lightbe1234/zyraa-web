import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, timeout: 45000,
  use: { baseURL: 'http://localhost:3000', headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  }, reporter: 'list',
});
