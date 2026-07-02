import { defineConfig, devices } from '@playwright/test'

const PORT = 3413

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}/visualizer`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
