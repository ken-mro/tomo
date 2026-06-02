// Capture marketing/preview screenshots of the built app in light and dark mode.
//
// Usage:
//   pnpm build && pnpm preview --port 4173   # in one terminal
//   node scripts/shot.mjs                    # in another (URL defaults to :4173)
//
// Requires Playwright + a Chromium build. If `playwright` isn't a project
// dependency, install it globally (`npm i -g playwright && npx playwright
// install chromium`); this script falls back to the global install.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

async function loadChromium() {
  try {
    return (await import('playwright')).chromium;
  } catch {
    // Fall back to a global Playwright install.
    const { execSync } = await import('node:child_process');
    const root = execSync('npm root -g').toString().trim();
    return require(`${root}/playwright`).chromium;
  }
}

const URL = process.env.URL || 'http://localhost:4173/';
const chromium = await loadChromium();
const browser = await chromium.launch();

async function shot(theme, file) {
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 820 },
    deviceScaleFactor: 2,
    colorScheme: theme === 'dark' ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  // Force the explicit theme so it doesn't depend solely on the OS hint.
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  await page.waitForTimeout(800);
  await page.screenshot({ path: file });
  console.log('wrote', file);
  await ctx.close();
}

await shot('light', 'docs/screenshots/screenshot-light.png');
await shot('dark', 'docs/screenshots/screenshot-dark.png');

await browser.close();
