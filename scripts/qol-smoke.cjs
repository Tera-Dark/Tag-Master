// Real browser workflow, synthetic files; no API calls.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const dir = path.join(process.cwd(), 'artifacts/qol-previews');
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: 'zh-CN' });
  const steps = [],
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('lora-tag-master-tutorial-seen-v1', 'true'));
  await page.goto(process.env.UI_BASE_URL || 'http://localhost:5173/', {
    waitUntil: 'networkidle',
  });
  await page
    .locator('input[type=file][accept="image/*"]')
    .setInputFiles(['Study-01.png', 'Study-02.png'].map((n) => path.join('scripts/fixtures', n)));
  await page.getByRole('option').first().waitFor();
  await page.getByText('已导入 2 张图片，请检查图片预览。', { exact: true }).waitFor();
  steps.push('Import completion feedback');
  await page.getByRole('option').first().focus();
  await page.keyboard.press('Enter');
  const selected = () => page.getByRole('option', { selected: true }).first().getAttribute('id');
  const initial = await selected();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('tab', { name: '提示词预设' }).click();
  const prompt = page.getByLabel('指令正文', { exact: false }),
    original = await prompt.inputValue();
  await prompt.fill('Unsaved QoL draft');
  await prompt.press('Alt+ArrowRight');
  assert.equal(await selected(), initial);
  steps.push('Modal editor does not navigate background image');
  await page.keyboard.press('Escape');
  await page.getByText('有尚未保存的设置。放弃这些修改并关闭？', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(dir, 'discard-confirmation.png') });
  steps.push('Escape protects unsaved settings');
  await page.getByRole('dialog').last().getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await prompt.inputValue(), 'Unsaved QoL draft');
  steps.push('Continue editing preserves draft');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: '确认', exact: true }).click();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('tab', { name: '提示词预设' }).click();
  assert.equal(await prompt.inputValue(), original);
  steps.push('Explicit discard restores saved prompt');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  steps.push('Unchanged settings close without nagging');
  await page.locator('#caption-textarea').fill('First image caption');
  await page.locator('#caption-textarea').press('Alt+ArrowRight');
  await page.waitForFunction(() => document.getElementById('caption-textarea')?.value === '');
  steps.push('Caption Alt navigation remains available');
  const report = { steps, errors, realApiRequests: 0 };
  fs.writeFileSync(path.join(dir, 'browser-check.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
