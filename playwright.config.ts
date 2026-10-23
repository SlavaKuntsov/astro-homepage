import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const PORT = 4321;
const baseURL = `http://localhost:${PORT}`;

// The browser seam: `pnpm build` runs first (see the `test:e2e` script), then
// this config serves the built preview and drives it. Per the anti-FOUC spec the
// theme is resolved from `localStorage.theme`, falling back to
// `prefers-color-scheme` (ADR-0003), so the two knobs the no-Flash test needs
// are wired here: `colorScheme` (native Playwright emulation, overridable per
// suite with `test.use({ colorScheme })`) and `localStorage` seeding. Seeding is
// a per-test fixture — `seedLocalStorage` in `e2e/fixtures.ts` — because the
// no-Flash tests vary the stored theme; a fixed config-wide value could use
// `use.storageState` instead.
export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	reporter: isCI
		? [['github'], ['html', { open: 'never' }]]
		: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL,
		colorScheme: 'light',
		trace: 'on-first-retry',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'pnpm preview',
		url: baseURL,
		reuseExistingServer: !isCI,
		timeout: 120_000,
	},
});
