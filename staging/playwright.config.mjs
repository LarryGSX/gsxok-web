import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  testMatch: 'compatibility.spec.mjs',
  workers: 1,
  timeout: 60000,
  use: {
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
    baseURL: 'http://127.0.0.1:4316',
  },
  outputDir: '.local/staging-browser-results',
  reporter: 'list',
})
