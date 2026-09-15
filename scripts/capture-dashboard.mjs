import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import process from 'node:process';

const port = 4175;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Continue waiting for the local server.
    }
    await new Promise((resolve) => setTimeout(resolve, 160));
  }
  throw new Error('Unable to start local demo server.');
}

let browser;
try {
  await waitForServer();
  const channel = process.env.PLAYWRIGHT_CHANNEL || 'msedge';
  browser = await chromium.launch({
    ...(channel === 'chromium' ? {} : { channel }),
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'docs/dashboard.png', fullPage: true });
  console.log('Created docs/dashboard.png');
} finally {
  await browser?.close();
  server.kill();
}
