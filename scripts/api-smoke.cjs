// Browser integration tests with ONLY intercepted mock APIs. No real provider requests or keys.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dir = path.join(process.cwd(), 'artifacts/api-previews');
fs.mkdirSync(dir, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    locale: 'zh-CN',
    reducedMotion: 'reduce',
  });
  const errors = [],
    steps = [],
    requests = [];
  let delayNext = false;
  const appUrl = process.env.UI_BASE_URL || 'http://localhost:5173/';
  const appOrigin = new URL(appUrl).origin;
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text()))
      errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => {
    errors.push('Native dialog: ' + d.message());
    d.dismiss();
  });
  await page.addInitScript(() => localStorage.setItem('lora-tag-master-tutorial-seen-v1', 'true'));
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin === appOrigin || ['data:', 'blob:'].includes(url.protocol))
      return route.continue();
    if (
      !['mock-gateway.test', 'api.openai.com', 'api.anthropic.com', 'localhost'].includes(
        url.hostname
      )
    ) {
      errors.push('Unexpected external request: ' + url.origin);
      return route.abort();
    }
    const body = req.postDataJSON();
    requests.push({ url: req.url(), method: req.method(), headers: req.headers(), body });
    let response;
    if (req.method() === 'GET') {
      if (url.pathname.includes('/google/'))
        response = url.searchParams.has('pageToken')
          ? {
              models: [
                {
                  name: 'models/private-alias',
                  displayName: 'Private Alias',
                  supportedGenerationMethods: ['generateContent'],
                },
              ],
            }
          : {
              models: [
                {
                  name: 'models/gemini-3.8-flash',
                  displayName: 'Gemini 3.8 Flash',
                  supportedGenerationMethods: ['generateContent'],
                },
              ],
              nextPageToken: 'second',
            };
      else
        response = {
          data: [
            {
              id: 'local-vision',
              name: 'Local Vision',
              architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
            },
          ],
        };
    } else if (url.pathname.endsWith(':generateContent'))
      response = {
        candidates: [
          {
            content: { parts: [{ thought: true, text: 'hidden reasoning' }, { text: 'red' }] },
            finishReason: 'STOP',
          },
        ],
      };
    else if (url.pathname.endsWith('/responses'))
      response = {
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'output_text', text: 'red' }] }],
      };
    else if (url.pathname.endsWith('/messages'))
      response = { content: [{ type: 'text', text: 'red' }], stop_reason: 'end_turn' };
    else response = { choices: [{ message: { content: 'red' }, finish_reason: 'stop' }] };
    if (delayNext) {
      delayNext = false;
      await new Promise((r) => setTimeout(r, 500));
    }
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    } catch {
      /* User cancellation can close the intercepted request. */
    }
  });
  const check = (name, condition = true) => {
    assert.ok(condition, name);
    steps.push(name);
  };
  const shot = async (name) => {
    await page.screenshot({ path: path.join(dir, `${name}.png`), animations: 'disabled' });
  };
  const saved = () =>
    page.evaluate(() =>
      JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(localStorage.getItem('lora-tag-master-settings-v9')), (c) =>
            c.charCodeAt(0)
          )
        )
      )
    );
  const footer = () => page.locator('.tm-settings-footer');
  const choose = async (name) =>
    page
      .getByRole('navigation', { name: '服务商列表' })
      .getByRole('button', { name: new RegExp(name) })
      .click();
  const test = async () => {
    await page.getByRole('button', { name: '测试调用', exact: true }).click();
    await page.getByText('图片请求已接受并返回文本', { exact: false }).waitFor();
  };
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await shot('01-provider-default');
  check('Fresh Gemini 3.8 default', (await saved()).model === 'gemini-3.8-flash');
  await choose('OpenAI');
  check(
    'Browsing provider does not activate',
    (await footer().getByText('gemini-3.8-flash', { exact: true }).count()) === 1
  );
  await choose('Google');
  await page.getByLabel('API Key', { exact: false }).fill('mock-google-key');
  await page
    .getByLabel('API 地址', { exact: true })
    .fill('https://mock-gateway.test/google/v1beta');
  await page.locator('.api-advanced summary').click();
  await page.getByRole('button', { name: '添加请求头', exact: true }).click();
  await page.getByLabel('请求头名称 1', { exact: true }).fill('X-Gateway');
  await page.getByLabel('请求头值 1', { exact: true }).fill('mock-header');
  await page
    .getByLabel('自定义请求参数（JSON）', { exact: true })
    .fill('{"generationConfig":{"thinkingConfig":{"thinkingLevel":"low"}}}');
  await shot('02-advanced-connection');
  await page.locator('.api-advanced summary').click();
  await test();
  const google = requests.at(-1);
  check(
    'Google custom endpoint/header/image request',
    google.url.startsWith(
      'https://mock-gateway.test/google/v1beta/models/gemini-3.8-flash:generateContent'
    ) &&
      google.headers['x-goog-api-key'] === 'mock-google-key' &&
      google.headers['x-gateway'] === 'mock-header' &&
      google.body.contents[0].parts[0].inlineData.mimeType === 'image/png' &&
      !google.url.includes('key=')
  );
  check('Test does not save draft', (await saved()).apiKey === '');
  await shot('03-image-test-success');
  await page.getByRole('button', { name: '获取模型', exact: true }).click();
  await page.getByRole('button', { name: '获取远端列表', exact: true }).click();
  await page.getByText('Private Alias', { exact: true }).waitFor();
  await shot('04-model-discovery');
  await page
    .locator('.api-library-row')
    .filter({ hasText: 'Private Alias' })
    .getByRole('checkbox')
    .check();
  await page.getByRole('button', { name: '添加所选模型', exact: true }).click();
  check(
    'Paginated model discovery uses configured origin',
    requests.filter((r) => r.method === 'GET').length === 2 &&
      requests
        .filter((r) => r.method === 'GET')
        .every((r) => r.url.startsWith('https://mock-gateway.test/'))
  );
  const aliasRow = page.locator('.api-model-row').filter({ hasText: 'private-alias' });
  await aliasRow.getByRole('button', { name: '设为打标模型', exact: true }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: '确认', exact: true }).click();
  check(
    'Unknown vision requires explicit confirmation',
    (await footer().getByText('private-alias', { exact: true }).count()) === 1
  );
  await shot('05-added-model-active');
  // Theme preview must not reset API drafts.
  await page.getByRole('tab', { name: '通用与并发' }).click();
  await page.getByRole('button', { name: '深色 Dark', exact: true }).click();
  await page.getByRole('tab', { name: /模型服务/ }).click();
  check(
    'Theme change retains draft key',
    (await page.getByLabel('API Key', { exact: false }).inputValue()) === 'mock-google-key'
  );
  check(
    'Theme change retains draft selected model',
    (await footer().getByText('private-alias', { exact: true }).count()) === 1
  );
  await page.getByRole('button', { name: '保存设置', exact: true }).click();
  let s = await saved();
  check(
    'Atomic save projects active provider',
    s.model === 'private-alias' &&
      s.apiKey === 'mock-google-key' &&
      s.baseUrl.includes('mock-gateway.test') &&
      s.customHeaders[0].value === 'mock-header'
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '设置', exact: true }).click();
  check('Reload preserves model and credentials', (await saved()).model === 'private-alias');
  await choose('OpenAI');
  await page.getByLabel('API Key', { exact: false }).fill('mock-openai-key');
  await test();
  check(
    'Native Responses image call',
    requests.at(-1).body.input[0].content[1].type === 'input_image' &&
      requests.at(-1).body.store === false
  );
  check(
    'Inactive provider test cannot switch tagging model',
    (await footer().getByText('private-alias', { exact: true }).count()) === 1
  );
  await shot('06-openai-responses');
  await choose('Anthropic');
  await page.getByLabel('API Key', { exact: false }).fill('mock-claude-key');
  await test();
  check(
    'Native Anthropic image call',
    requests.at(-1).headers['x-api-key'] === 'mock-claude-key' &&
      requests.at(-1).body.thinking.type === 'disabled'
  );
  await shot('07-anthropic-messages');
  await page.getByRole('button', { name: '添加服务商', exact: true }).first().click();
  await shot('08-add-provider');
  await page.getByRole('button', { name: /Ollama 本地/ }).click();
  await page.getByRole('button', { name: '添加并配置', exact: true }).click();
  await page.getByRole('button', { name: '手动添加', exact: true }).click();
  await page.getByLabel('模型 ID', { exact: true }).fill('my-local-vision');
  await page.getByLabel('显示名称（可选）', { exact: true }).fill('My local model');
  await page.getByRole('combobox', { name: /图片输入能力/ }).selectOption('enabled');
  await shot('09-manual-model');
  await page.getByRole('button', { name: '保存模型', exact: true }).click();
  await test();
  check(
    'Local no-auth works without API key',
    requests.at(-1).url === 'http://localhost:11434/v1/chat/completions' &&
      !requests.at(-1).headers.authorization
  );
  await page
    .locator('.api-model-row')
    .getByRole('button', { name: '设为打标模型', exact: true })
    .click();
  check(
    'Explicit activation selects local model',
    (await footer().getByText('my-local-vision', { exact: true }).count()) === 1
  );
  delayNext = true;
  await page.getByRole('button', { name: '测试调用', exact: true }).click();
  await page.getByRole('button', { name: '停止测试', exact: true }).click();
  check(
    'Test is cancellable',
    await page.getByRole('button', { name: '测试调用', exact: true }).isEnabled()
  );
  await page.locator('.api-advanced summary').click();
  await page.getByLabel('自定义请求参数（JSON）', { exact: true }).fill('{bad-json');
  const before = requests.length;
  await page.getByRole('button', { name: '测试调用', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'JSON' }).waitFor();
  check('Invalid expert JSON is rejected before network', requests.length === before);
  await page.getByRole('button', { name: '保存设置', exact: true }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: '确认', exact: true }).click();
  check('Invalid JSON cannot be silently saved', (await saved()).model === 'private-alias');
  await page.getByLabel('自定义请求参数（JSON）', { exact: true }).fill('');
  await page.locator('.api-advanced summary').click();
  await shot('10-local-provider');
  await page.getByRole('tab', { name: '提示词预设' }).click();
  await shot('11-prompts-tags');
  await page.getByRole('button', { name: /02 自然语言/ }).click();
  check(
    'Caption preset selected',
    (await page.getByLabel('指令正文', { exact: false }).inputValue()).includes(
      'One factual English paragraph'
    )
  );
  await page
    .getByLabel('指令正文', { exact: false })
    .fill('My exact custom prompt.\nVisual Prompt Compiler v2.0 must stay.');
  await page.getByRole('button', { name: '另存为预设', exact: true }).click();
  await page.getByRole('dialog').last().getByRole('textbox').fill('保留自定义');
  await page.getByRole('dialog').last().getByRole('button', { name: '确认', exact: true }).click();
  await shot('12-custom-prompt');
  await page.getByRole('button', { name: '保存设置', exact: true }).click();
  s = await saved();
  check(
    'Custom prompt saved verbatim',
    s.activePrompt === 'My exact custom prompt.\nVisual Prompt Compiler v2.0 must stay.' &&
      s.customTemplates.length === 1
  );
  check(
    'No-auth active projection survives save',
    s.apiKey === '' && s.authMode === 'none' && s.model === 'my-local-vision'
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('tab', { name: '提示词预设' }).click();
  check(
    'Custom legacy-looking prompt survives reload',
    (await page.getByLabel('指令正文', { exact: false }).inputValue()).includes('must stay.')
  );
  await page.getByRole('button', { name: /03 标签 \+ 描述/ }).click();
  await shot('13-prompts-hybrid-dark');
  await page.getByRole('tab', { name: '通用与并发' }).click();
  await page.getByRole('button', { name: '浅色 Light', exact: true }).click();
  await page.getByRole('tab', { name: '提示词预设' }).click();
  await shot('14-prompts-light');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: /模型服务/ }).click();
  await shot('15-mobile-provider');
  check(
    'Mobile no horizontal overflow',
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  );
  await page.locator('.api-workspace').evaluate((el) => (el.scrollTop = el.scrollHeight));
  await shot('16-mobile-model-test');
  await page.getByRole('tab', { name: '提示词预设' }).click();
  await shot('17-mobile-prompts');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: '确认', exact: true }).click();
  check(
    'Cancel discards unsaved prompt change',
    (await saved()).activePrompt.includes('must stay.')
  );
  fs.writeFileSync(
    path.join(dir, 'browser-check.json'),
    JSON.stringify(
      {
        steps,
        errors,
        mockRequests: requests.length,
        protocols: ['Gemini', 'Chat Completions', 'Responses', 'Messages'],
        realApiRequests: 0,
      },
      null,
      2
    )
  );
  console.log(JSON.stringify({ steps, errors, mockRequests: requests.length }, null, 2));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
