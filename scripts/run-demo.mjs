import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const port = 4174;
const baseUrl = `http://127.0.0.1:${port}`;
const root = process.cwd();
const artifactsDir = path.join(root, 'artifacts');

async function waitForServer(url, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  throw new Error(`Demo server did not start within ${timeoutMs}ms.`);
}

async function completeWorkflow(page, mode) {
  await page.getByLabel('选择当前筛选结果').check();
  await page.getByRole('button', { name: '对已选商品批量操作' }).click();
  await page.getByRole('dialog', { name: '批量处理商品' }).getByRole('button', { name: '下一步' }).click();

  if (mode === 'authorize') {
    await page.getByLabel('批量授权分发').check();
    await page.locator('#partner').selectOption({ label: 'Northstar Retail' });
  } else {
    await page.getByLabel('加价幅度').fill('5');
  }

  await page.getByRole('dialog', { name: '批量处理商品' }).getByRole('button', { name: '下一步' }).click();
  const phrase = await page.locator('#confirmation-phrase').textContent();
  if (!phrase) throw new Error('Confirmation phrase was not rendered.');
  await page.locator('#confirmation-input').fill(phrase);
  await page.getByRole('button', { name: '确认并创建任务' }).click();
  await page.getByText('当前批量任务 已完成').waitFor({ state: 'visible', timeout: 5000 });
}

const server = spawn(process.execPath, ['scripts/local-server.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
});

let browser;
try {
  await mkdir(artifactsDir, { recursive: true });
  await waitForServer(baseUrl);

  const channel = process.env.PLAYWRIGHT_CHANNEL || 'msedge';
  browser = await chromium.launch({
    ...(channel === 'chromium' ? {} : { channel }),
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await page.getByLabel('区域').selectOption('Asia');
  await page.getByLabel('产品范围').selectOption('single');
  await page.getByRole('button', { name: '应用筛选' }).click();
  await page.getByText('显示 3 个模拟商品').waitFor();

  await completeWorkflow(page, 'config');
  await completeWorkflow(page, 'authorize');
  await page.getByText('授权分发').first().waitFor();

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '自动演示经营配置' }).click();
  await page.getByRole('dialog', { name: '批量处理商品' }).waitFor({ state: 'visible', timeout: 3000 });
  await page.getByText('当前批量任务 已完成').waitFor({ state: 'visible', timeout: 6000 });
  await page.getByText('演示执行完成').waitFor();

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '自动演示调整筛选器' }).click();
  await page.getByRole('dialog', { name: '调整商品筛选器' }).waitFor({ state: 'visible', timeout: 3000 });
  await page.getByText('筛选器调整完成').waitFor({ timeout: 5000 });
  await page.getByText('显示 3 个模拟商品').waitFor();

  const screenshot = path.join(artifactsDir, 'e2e-success.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const summary = {
    ok: true,
    checkedAt: new Date().toISOString(),
    workflows: ['batch configuration', 'authorization distribution', 'auto-play configuration', 'auto-play filter adjustment'],
    filteredProducts: 3,
    screenshot: 'artifacts/e2e-success.png',
  };
  await writeFile(path.join(artifactsDir, 'e2e-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
