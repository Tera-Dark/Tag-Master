import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiProtocol } from '../../types';
import {
  activeConnection,
  buildHeaders,
  connectionProblem,
  extraBody,
  redact,
  requestJson,
  resolveEndpoint,
  taggingProblem,
} from '../providers/connection';
import {
  buildGenerationBody,
  generateText,
  parseGenerationResponse,
} from '../providers/generation';
import { ProviderError, RateLimitError, parseRetryAfter } from '../providers/errors';
import { DEFAULT_SETTINGS, migrateSettings } from '../providers/settingsMigration';
import { discoverModels, modelFromRemote, visionStatus } from '../modelDetector';
import { testConnection } from '../geminiService';
const c = {
  protocol: 'openai_compatible' as AiProtocol,
  baseUrl: 'https://example.test/v1',
  apiKey: 'secret-test-key',
};
const image = 'data:image/png;base64,aGVsbG8=';
const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('shared endpoint and credentials', () => {
  it.each([
    ['https://example.test', 'https://example.test/v1/chat/completions'],
    ['https://example.test/v1/', 'https://example.test/v1/chat/completions'],
    ['https://example.test/gateway/custom', 'https://example.test/gateway/custom/chat/completions'],
    ['https://example.test/v1beta/openai/', 'https://example.test/v1beta/openai/chat/completions'],
    ['https://example.test/v1/chat/completions', 'https://example.test/v1/chat/completions'],
    [
      'https://example.test/v1?api-version=2026-09-01',
      'https://example.test/v1/chat/completions?api-version=2026-09-01',
    ],
  ])('resolves %s without breaking gateway prefixes', (baseUrl, expected) =>
    expect(resolveEndpoint({ ...c, baseUrl }, 'generate', 'x')).toBe(expected)
  );
  it('uses custom Gemini origins for generation AND discovery, without query keys', () => {
    const g = { ...c, protocol: 'google' as const, baseUrl: 'https://example.test/proxy/v1beta' };
    expect(resolveEndpoint(g, 'generate', 'models/gemini-3.8-flash')).toBe(
      'https://example.test/proxy/v1beta/models/gemini-3.8-flash:generateContent'
    );
    expect(resolveEndpoint(g, 'models')).toBe('https://example.test/proxy/v1beta/models');
    expect(buildHeaders(g).get('x-goog-api-key')).toBe(c.apiKey);
    expect(
      resolveEndpoint(
        { ...g, baseUrl: 'https://example.test/v1beta/models/old:generateContent' },
        'generate',
        'new'
      )
    ).toContain('/models/new:generateContent');
  });
  it.each([
    ['openai_responses', '/v1/responses'],
    ['anthropic', '/v1/messages'],
  ] as const)('resolves %s', (protocol, path) =>
    expect(resolveEndpoint({ ...c, protocol }, 'generate', 'x')).toBe(`https://example.test${path}`)
  );
  it('rejects missing destinations and protocol/endpoint mismatches', () => {
    expect(connectionProblem({ ...c, baseUrl: '' })).toContain('API 地址');
    expect(connectionProblem({ ...c, baseUrl: 'https://example.test/v1/messages' })).toContain(
      '不匹配'
    );
  });
  it('supports exact deployment endpoints and explicit same-origin model URLs', () => {
    const exact = {
      ...c,
      endpointMode: 'exact' as const,
      baseUrl: 'https://example.test/deployment/action?api-version=1',
    };
    expect(resolveEndpoint(exact, 'generate', 'x')).toBe(exact.baseUrl);
    expect(() => resolveEndpoint(exact, 'models')).toThrow('无法推断');
    expect(resolveEndpoint({ ...exact, modelsUrl: 'https://example.test/catalog' }, 'models')).toBe(
      'https://example.test/catalog'
    );
    expect(() =>
      resolveEndpoint({ ...exact, modelsUrl: 'https://evil.test/models' }, 'models')
    ).toThrow('同源');
  });
  it.each([
    'javascript:alert(1)',
    'https://user:pass@example.test',
    'https://example.test?key=secret',
    'https://example.test#fragment',
    'not-a-url',
  ])('rejects unsafe/invalid URL %s', (baseUrl) =>
    expect(connectionProblem({ ...c, baseUrl })).toBeTruthy()
  );
  it('handles custom auth headers case-insensitively and supports no-auth local servers', () => {
    expect(
      buildHeaders({ ...c, customHeaders: [{ key: 'authorization', value: 'Custom token' }] }).get(
        'Authorization'
      )
    ).toBe('Custom token');
    expect(buildHeaders({ ...c, protocol: 'anthropic' }).get('anthropic-version')).toBe(
      '2023-06-01'
    );
    expect(buildHeaders({ ...c, protocol: 'anthropic' }).get('x-api-key')).toBe(c.apiKey);
    expect(buildHeaders({ ...c, authMode: 'api-key' }).get('api-key')).toBe(c.apiKey);
    expect(buildHeaders({ ...c, authMode: 'none' }).has('Authorization')).toBe(false);
    expect(connectionProblem({ ...c, apiKey: '', authMode: 'none' }, 'local-model')).toBeNull();
    expect(connectionProblem({ ...c, apiKey: '' })).toContain('API Key');
    expect(
      connectionProblem({
        ...c,
        apiKey: '',
        customHeaders: [{ key: 'x-api-key', value: 'custom-secret' }],
      })
    ).toBeNull();
    expect(connectionProblem({ ...c, customHeaders: [{ key: 'Cookie', value: 'no' }] })).toContain(
      '不允许'
    );
  });
  it('validates expert JSON and prevents overriding the selected prompt/model/image', () => {
    expect(() => extraBody({ ...c, requestBodyJson: '[' })).toThrow('JSON');
    expect(connectionProblem({ ...c, requestBodyJson: '{"model":"other"}' })).toContain('不能覆盖');
    expect(connectionProblem({ ...c, requestBodyJson: '{"stream":true}' })).toContain('非流式');
    expect(connectionProblem({ ...c, requestTimeoutSec: NaN })).toContain('超时');
    expect(
      redact(`failed ${c.apiKey} custom-token`, {
        ...c,
        customHeaders: [{ key: 'x-test', value: 'custom-token' }],
      })
    ).not.toContain('secret');
  });
});

describe('protocol payloads and text parsing', () => {
  it('constructs image-to-text requests without incompatible universal sampling parameters', () => {
    const g = buildGenerationBody(
      { ...c, protocol: 'google' },
      'gemini-3.8-flash',
      'tag this',
      image
    );
    expect(g).toMatchObject({
      generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: 'low' } },
    });
    expect(JSON.stringify(g)).not.toContain('minimal');
    expect(
      JSON.stringify(
        buildGenerationBody({ ...c, protocol: 'google' }, 'gemini-2.5-flash', 'p', image)
      )
    ).not.toContain('thinkingLevel');
    expect(buildGenerationBody(c, 'gpt-5.6-terra', 'p', image)).toHaveProperty(
      'max_completion_tokens'
    );
    expect(buildGenerationBody(c, 'qwen-vl', 'p', image)).toHaveProperty('max_tokens');
    const r = buildGenerationBody(
      { ...c, protocol: 'openai_responses' },
      'gpt-5.6-terra',
      'p',
      image
    );
    expect(r).toMatchObject({ store: false, max_output_tokens: 4096 });
    expect(JSON.stringify(r)).toContain('input_image');
    const a = buildGenerationBody({ ...c, protocol: 'anthropic' }, 'claude-sonnet-5', 'p', image);
    expect(a).toMatchObject({ thinking: { type: 'disabled' } });
    expect(JSON.stringify(a)).toContain('media_type');
    expect(a).not.toHaveProperty('temperature');
  });
  it.each([
    [
      'google',
      {
        candidates: [
          {
            content: {
              parts: [
                { thought: true, text: 'secret thought' },
                { text: 'red ' },
                { text: 'vase' },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      },
    ],
    [
      'openai_compatible',
      {
        choices: [
          {
            message: {
              content: [
                { type: 'text', text: 'red ' },
                { type: 'text', text: 'vase' },
              ],
            },
          },
        ],
      },
    ],
    [
      'openai_responses',
      {
        status: 'completed',
        output: [
          { type: 'reasoning', summary: [] },
          { type: 'message', content: [{ type: 'output_text', text: 'red vase' }] },
        ],
      },
    ],
    [
      'anthropic',
      {
        content: [
          { type: 'thinking', thinking: 'secret thought' },
          { type: 'text', text: 'red vase' },
        ],
        stop_reason: 'end_turn',
      },
    ],
  ] as [AiProtocol, unknown][])('extracts only visible text from %s', (protocol, data) =>
    expect(parseGenerationResponse(protocol, data)).toBe('red vase')
  );
  it.each([
    ['google', { candidates: [{ finishReason: 'MAX_TOKENS' }] }],
    ['google', { promptFeedback: { blockReason: 'SAFETY' } }],
    ['openai_compatible', { choices: [{ finish_reason: 'length' }] }],
    ['openai_compatible', { choices: [{ message: { refusal: 'No' } }] }],
    ['openai_responses', { status: 'incomplete' }],
    ['anthropic', { stop_reason: 'max_tokens' }],
    ['anthropic', { content: [{ type: 'thinking', thinking: 'only thought' }] }],
  ] as [AiProtocol, unknown][])(
    'rejects empty/truncated/refused %s output instead of saving corrupt captions',
    (protocol, data) => expect(() => parseGenerationResponse(protocol, data)).toThrow(ProviderError)
  );
});

describe('transport, diagnostics, pagination', () => {
  it('sends one request on server failure, with no nested retries', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(json({ error: { message: 'temporarily unavailable' } }, 503));
    vi.stubGlobal('fetch', fetch);
    await expect(generateText(c, 'model', 'prompt', image)).rejects.toMatchObject({
      status: 503,
      retryable: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('never retries CORS/network failures via an unconfigured proxy', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    await expect(generateText(c, 'model', 'prompt', image)).rejects.toThrow('CORS');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('redacts reflected keys and distinguishes auth failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ error: { message: `Invalid ${c.apiKey}` } }, 401))
    );
    await expect(requestJson(c, resolveEndpoint(c, 'models'))).rejects.toThrow('[REDACTED]');
  });
  it('keeps 429 retry hints even with non-JSON responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('busy', { status: 429, headers: { 'Retry-After': '13' } }))
    );
    await expect(requestJson(c, resolveEndpoint(c, 'models'))).rejects.toMatchObject({
      name: 'RateLimitError',
      retryAfterSec: 13,
    });
    expect(new RateLimitError('busy')).toHaveProperty('isRateLimit', true);
    expect(
      parseRetryAfter(
        new Response('', { headers: { 'Retry-After': new Date(Date.now() + 30000).toUTCString() } })
      )
    ).toBeGreaterThanOrEqual(29);
  });
  it('aborts before fetching and keeps the timeout active while reading the body', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(requestJson(c, c.baseUrl, {}, AbortSignal.abort())).rejects.toHaveProperty(
      'name',
      'AbortError'
    );
    expect(fetch).not.toHaveBeenCalled();
    vi.useFakeTimers();
    fetch.mockImplementation((_url, init) =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError'))
            )
          ),
      })
    );
    const pending = requestJson({ ...c, requestTimeoutSec: 5 }, c.baseUrl);
    const assertion = expect(pending).rejects.toThrow('超时');
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('discovers paginated Gemini lists using custom origin and headers', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          models: [
            { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
          ],
          nextPageToken: 'token-2',
        })
      )
      .mockResolvedValueOnce(
        json({
          models: [
            { name: 'models/embedding-only', supportedGenerationMethods: ['embedContent'] },
            { name: 'models/custom-vision' },
          ],
        })
      );
    vi.stubGlobal('fetch', fetch);
    const found = await discoverModels({
      ...c,
      protocol: 'google',
      customHeaders: [{ key: 'X-Gateway', value: 'test' }],
    });
    expect(found.map((m) => m.id)).toEqual(['custom-vision', 'gemini-3.8-flash']);
    expect(fetch.mock.calls[1][0]).toContain('pageToken=token-2');
    expect(fetch.mock.calls[0][1].headers.get('X-Gateway')).toBe('test');
  });
  it('detects pagination loops instead of hanging', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(json({ models: [], nextPageToken: 'same' })))
    );
    await expect(discoverModels({ ...c, protocol: 'google' })).rejects.toThrow('分页循环');
  });
  it('uses a draft provider/model for image tests, not the global default', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ choices: [{ message: { content: 'red' } }] }));
    vi.stubGlobal('fetch', fetch);
    const settings = {
      ...structuredClone(DEFAULT_SETTINGS),
      providers: [{ ...c, id: 'draft', name: 'Draft', selectedModelId: 'custom-vision' }],
      activeProviderId: 'draft',
    };
    const result = await testConnection(settings);
    expect(result).toMatchObject({ model: 'custom-vision', mode: 'vision', preview: 'red' });
    expect(fetch.mock.calls[0][0]).toBe('https://example.test/v1/chat/completions');
    expect(JSON.parse(fetch.mock.calls[0][1].body).messages[0].content[1].image_url.url).toMatch(
      /^data:image\/png/
    );
  });
});

describe('settings migration and capability provenance', () => {
  it('starts with Gemini 3.8 Flash and matching native URL', () => {
    const s = migrateSettings(null);
    expect(s.model).toBe('gemini-3.8-flash');
    expect(s.baseUrl).toContain('generativelanguage');
    expect(s.providers?.map((p) => p.protocol)).toEqual([
      'google',
      'openai_responses',
      'anthropic',
    ]);
  });
  it('preserves custom credentials, models, headers and edited prompts', () => {
    const s = migrateSettings({
      ...DEFAULT_SETTINGS,
      activePrompt: 'Visual Prompt Compiler v2.0 edited!',
      customTemplates: [{ id: 'mine', label: 'mine', value: 'exact' }],
      activeProviderId: 'custom',
      providers: [
        {
          ...c,
          id: 'custom',
          name: 'Custom',
          models: [{ id: 'my-vl', name: 'My VL', capabilities: [], source: 'manual' }],
          selectedModelId: 'my-vl',
          customHeaders: [{ key: 'X-Test', value: 'value' }],
        },
      ],
    });
    expect(s.activePrompt).toBe('Visual Prompt Compiler v2.0 edited!');
    expect(s.apiKey).toBe(c.apiKey);
    expect(s.model).toBe('my-vl');
    expect(s.customTemplates[0].value).toBe('exact');
    expect(s.customHeaders).toHaveLength(1);
  });
  it('updates stock Google defaults additively and is idempotent', () => {
    const s = migrateSettings({
      ...DEFAULT_SETTINGS,
      model: 'gemini-2.0-flash',
      providers: [
        {
          id: 'google-default',
          name: 'Google',
          protocol: 'google',
          baseUrl: 'https://generativelanguage.googleapis.com',
          apiKey: 'key',
          models: [
            { id: 'gemini-2.0-flash', name: 'old', capabilities: ['vision'] },
            { id: 'custom', name: 'Custom', capabilities: [] },
          ],
        },
      ],
    });
    expect(s.model).toBe('gemini-3.8-flash');
    expect(s.providers![0].models!.map((m) => m.id)).toContain('custom');
    expect(migrateSettings(s)).toEqual(s);
  });
  it('preserves legacy top-level custom providers without losing their secret', () => {
    const s = migrateSettings({
      protocol: 'openai_compatible',
      baseUrl: 'https://my-gateway.test/prefix',
      apiKey: 'legacy-key',
      model: 'alias',
      activePrompt: 'custom',
    });
    expect(s.apiKey).toBe('legacy-key');
    expect(s.baseUrl).toBe('https://my-gateway.test/prefix');
    expect(s.model).toBe('alias');
    expect(s.providers).toHaveLength(1);
  });
  it('does not resurrect removed providers or silently choose a new active model', () => {
    const s = migrateSettings({
      ...DEFAULT_SETTINGS,
      providers: [],
      activeProviderId: '',
      model: '',
      apiKey: '',
    });
    expect(s.providers).toEqual([]);
    expect(s.activeProviderId).toBe('');
    expect(taggingProblem(s)).toContain('服务商');
    const remaining = migrateSettings({ ...DEFAULT_SETTINGS, activeProviderId: '', model: '' });
    expect(remaining.activeProviderId).toBe('');
  });
  it('projects only the active provider and accepts no-key local configuration', () => {
    const s = {
      ...structuredClone(DEFAULT_SETTINGS),
      activeProviderId: 'local',
      providers: [
        {
          ...c,
          id: 'local',
          name: 'Local',
          authMode: 'none' as const,
          apiKey: '',
          selectedModelId: 'local-vision',
        },
      ],
    };
    expect(activeConnection(s).apiKey).toBe('');
    expect(taggingProblem(s)).toBeNull();
  });
  it('retains honest unknown capabilities and excludes image generators', () => {
    const unknown = modelFromRemote({ id: 'my-private-model' }, 'openai_compatible')!;
    expect(visionStatus(unknown)).toBe('unknown');
    expect(
      visionStatus(
        modelFromRemote(
          {
            id: 'image-generator',
            architecture: { input_modalities: ['text'], output_modalities: ['image'] },
          },
          'openai_compatible'
        )!
      )
    ).toBe('unsupported');
    expect(
      visionStatus(
        modelFromRemote(
          {
            id: 'alias',
            architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
          },
          'openai_compatible'
        )!
      )
    ).toBe('supported');
    expect(visionStatus(modelFromRemote({ id: 'gemini-3.8-flash-image' }, 'google')!)).toBe(
      'unsupported'
    );
  });
});
