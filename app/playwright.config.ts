import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// E2E runs against a dev server with its own throwaway data dir, so tests never touch real data.
// PD_BASE_URL points the suite at an already running server instead (it then owns its data dir).
const port = Number(process.env.PD_PORT ?? 3417);
const baseURL = process.env.PD_BASE_URL ?? `http://localhost:${port}`;
const dataDir = process.env.PENCIL_DATA_DIR ?? mkdtempSync(join(tmpdir(), "pencil-down-e2e-"));

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "laptop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 780 }, hasTouch: true } },
  ],
  webServer: process.env.PD_BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${port}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: true,
        timeout: 120_000,
        env: { PENCIL_DATA_DIR: dataDir },
      },
});
