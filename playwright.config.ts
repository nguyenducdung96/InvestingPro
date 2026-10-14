import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3000", browserName: "chromium" },
  webServer: [
    {
      command: "node tests/fixtures/supabase-server.mjs",
      url: "http://127.0.0.1:54329",
      timeout: 30000,
    },
    {
      command:
        "node apps/web/node_modules/next/dist/bin/next dev apps/web --hostname 127.0.0.1",
      url: "http://127.0.0.1:3000",
      env: {
        SUPABASE_URL: "http://127.0.0.1:54329",
        SUPABASE_ANON_KEY: "fixture-anon",
      },
      timeout: 120000,
    },
  ],
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: { viewport: { width: 375, height: 812 }, reducedMotion: "reduce" },
    },
  ],
});
