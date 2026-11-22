import { AiProvider, AuthMode, ProviderProtocol } from '../types/prompt';

export interface ProviderPresetItem {
  id: string;
  labelZh: string;
  labelEn: string;
  descZh: string;
  descEn: string;
  provider: Omit<AiProvider, 'id'>;
}

export const STUDIO_GEMINI_PROVIDER: AiProvider = {
  id: 'studio-gemini',
  name: 'Studio Gemini (内置免密)',
  protocol: 'studio_gemini',
  baseUrl: '/api',
  apiKey: '',
  authMode: 'none',
  selectedModelId: 'gemini-4-hydrogen',
  availableModels: ['gemini-4-hydrogen'],
  maxOutputTokens: 4096,
  isBuiltIn: true,
};

export const EXTERNAL_PROVIDER_PRESETS: ProviderPresetItem[] = [
  {
    id: 'openai-compatible',
    labelZh: 'OpenAI 兼容 / 中转网关',
    labelEn: 'OpenAI Compatible Gateway',
    descZh: '支持 OneAPI、NewAPI、vLLM 与各类第三方中转地址',
    descEn: 'Custom base URL for OneAPI, vLLM, or self-hosted gateways',
    provider: {
      name: '自定义 OpenAI 兼容',
      protocol: 'openai_compatible',
      baseUrl: '',
      apiKey: '',
      authMode: 'bearer',
      selectedModelId: '',
      availableModels: [],
      maxOutputTokens: 4096,
    },
  },
  {
    id: 'openrouter',
    labelZh: 'OpenRouter',
    labelEn: 'OpenRouter',
    descZh: '多模型聚合平台，支持自动拉取可用视觉模型列表',
    descEn: 'Multi-model router with live model catalog discovery',
    provider: {
      name: 'OpenRouter',
      protocol: 'openai_compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: '',
      authMode: 'bearer',
      selectedModelId: 'google/gemini-2.5-flash',
      availableModels: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini'],
      maxOutputTokens: 4096,
    },
  },
  {
    id: 'siliconflow',
    labelZh: 'SiliconFlow (硅基流动)',
    labelEn: 'SiliconFlow',
    descZh: '支持 Qwen-VL / InternVL 等国内视觉大模型',
    descEn: 'Supports Qwen-VL and multimodal endpoints',
    provider: {
      name: 'SiliconFlow',
      protocol: 'openai_compatible',
      baseUrl: 'https://api.siliconflow.cn/v1',
      apiKey: '',
      authMode: 'bearer',
      selectedModelId: 'Qwen/Qwen2.5-VL-72B-Instruct',
      availableModels: ['Qwen/Qwen2.5-VL-72B-Instruct'],
      maxOutputTokens: 4096,
    },
  },
  {
    id: 'openai',
    labelZh: 'OpenAI 官方',
    labelEn: 'OpenAI',
    descZh: '官方 Responses / Chat 接口',
    descEn: 'Official OpenAI Responses API',
    provider: {
      name: 'OpenAI',
      protocol: 'openai_responses',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      authMode: 'bearer',
      selectedModelId: 'gpt-4.1-mini',
      availableModels: ['gpt-4.1-mini', 'gpt-4o'],
      maxOutputTokens: 4096,
    },
  },
  {
    id: 'anthropic',
    labelZh: 'Anthropic Claude',
    labelEn: 'Anthropic',
    descZh: 'Claude 原生 Messages 接口',
    descEn: 'Anthropic native Messages API',
    provider: {
      name: 'Anthropic',
      protocol: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: '',
      authMode: 'x-api-key',
      selectedModelId: 'claude-sonnet-4-20250514',
      availableModels: ['claude-sonnet-4-20250514'],
      maxOutputTokens: 4096,
    },
  },
  {
    id: 'ollama',
    labelZh: 'Ollama (本地免密)',
    labelEn: 'Ollama Local',
    descZh: '运行于本机 11434 端口，支持 Qwen2.5-VL / LLaVA',
    descEn: 'Localhost port 11434 · No key required',
    provider: {
      name: 'Ollama',
      protocol: 'openai_compatible',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: '',
      authMode: 'none',
      selectedModelId: '',
      availableModels: [],
      maxOutputTokens: 4096,
    },
  },
  {
    id: 'lmstudio',
    labelZh: 'LM Studio (本地免密)',
    labelEn: 'LM Studio Local',
    descZh: '运行于本机 1234 端口，OpenAI 兼容接口',
    descEn: 'Localhost port 1234 · No key required',
    provider: {
      name: 'LM Studio',
      protocol: 'openai_compatible',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      authMode: 'none',
      selectedModelId: '',
      availableModels: [],
      maxOutputTokens: 4096,
    },
  },
];

export const PROTOCOL_LABELS: Record<ProviderProtocol, string> = {
  studio_gemini: 'Built-in Studio Gemini',
  openai_compatible: 'OpenAI Compatible (/chat/completions)',
  openai_responses: 'OpenAI Responses (/responses)',
  anthropic: 'Anthropic Messages (/messages)',
};

// Tiny 64x64 solid PNG for fast vision diagnostic ping
const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAYklEQVR4nO3PMQ0AIADAMMAP/s0gBhEcDcmqYJtn7/GzpQNeNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaBdsB0BtqEpL5IAAAAASUVORK5CYII=';

export function isLocalEndpoint(url: string): boolean {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?/i.test(
    url.trim()
  );
}

export function resolveProviderUrl(
  provider: AiProvider,
  action: 'models' | 'generate'
): string {
  if (provider.protocol === 'studio_gemini') {
    return '/api/health';
  }

  const raw = provider.baseUrl.trim().replace(/\/+$/, '');
  if (!raw) throw new Error('API 地址不能为空');

  if (action === 'models') {
    if (raw.endsWith('/models')) return raw;
    if (/\/v\d+(?:beta)?$/i.test(raw)) return `${raw}/models`;
    return `${raw}/v1/models`;
  }

  if (provider.protocol === 'anthropic') {
    if (raw.endsWith('/messages')) return raw;
    if (/\/v\d+$/i.test(raw)) return `${raw}/messages`;
    return `${raw}/v1/messages`;
  }

  if (provider.protocol === 'openai_responses') {
    if (raw.endsWith('/responses')) return raw;
    if (/\/v\d+$/i.test(raw)) return `${raw}/responses`;
    return `${raw}/v1/responses`;
  }

  if (raw.endsWith('/chat/completions')) return raw;
  if (/\/v\d+$/i.test(raw)) return `${raw}/chat/completions`;
  return `${raw}/v1/chat/completions`;
}

export function buildProviderHeaders(provider: AiProvider): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const key = provider.apiKey.trim();
  const mode: AuthMode = provider.authMode || 'auto';

  if (mode === 'none' || !key) {
    if (provider.protocol === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
    }
    return headers;
  }

  const effectiveMode =
    mode === 'auto'
      ? provider.protocol === 'anthropic'
        ? 'x-api-key'
        : 'bearer'
      : mode;

  if (effectiveMode === 'x-api-key') {
    headers['x-api-key'] = key;
    if (provider.protocol === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
    }
  } else if (effectiveMode === 'api-key') {
    headers['api-key'] = key;
  } else {
    headers['Authorization'] = `Bearer ${key}`;
  }
  return headers;
}

export function redactProviderSecret(message: string, provider: AiProvider): string {
  const key = provider.apiKey.trim();
  if (!key || key.length < 4) return message.slice(0, 600);
  return message.split(key).join('[REDACTED]').slice(0, 600);
}

async function smartProviderRequest(
  provider: AiProvider,
  targetUrl: string,
  method: 'GET' | 'POST',
  body?: unknown,
  signal?: AbortSignal
): Promise<unknown> {
  const headers = buildProviderHeaders(provider);

  const runDirect = async () => {
    const res = await fetch(targetUrl, {
      method,
      headers,
      signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200) || res.statusText}`);
    }
    if (!res.ok) {
      const errMsg =
        (parsed as { error?: { message?: string } | string })?.error &&
        typeof (parsed as { error?: unknown }).error === 'object'
          ? (parsed as { error: { message?: string } }).error.message
          : typeof (parsed as { error?: unknown }).error === 'string'
          ? (parsed as { error: string }).error
          : res.statusText;
      throw new Error(`HTTP ${res.status}: ${errMsg || 'Request failed'}`);
    }
    return parsed;
  };

  if (isLocalEndpoint(targetUrl)) {
    return runDirect();
  }

  try {
    return await runDirect();
  } catch (err) {
    // If browser CORS / network error occurred on a remote HTTPS endpoint, relay via our backend
    if (err instanceof TypeError) {
      const relayRes = await fetch('/api/providers/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          url: targetUrl,
          method,
          headers,
          body,
        }),
      });
      const data = await relayRes.json();
      if (!relayRes.ok) {
        throw new Error(data.error || `Relay error (${relayRes.status})`);
      }
      return data;
    }
    throw err;
  }
}

export async function fetchProviderModels(
  provider: AiProvider,
  signal?: AbortSignal
): Promise<string[]> {
  if (provider.protocol === 'studio_gemini') {
    return ['gemini-4-hydrogen'];
  }
  const url = resolveProviderUrl(provider, 'models');
  const raw = (await smartProviderRequest(provider, url, 'GET', undefined, signal)) as {
    data?: { id?: string }[];
    models?: { name?: string; id?: string }[];
  };

  const list = Array.isArray(raw?.data)
    ? raw.data.map((m) => m.id).filter((id): id is string => Boolean(id))
    : Array.isArray(raw?.models)
    ? raw.models
        .map((m) => m.id || m.name)
        .filter((id): id is string => Boolean(id))
    : [];

  return Array.from(new Set(list)).sort();
}

export async function invokeExternalProvider(params: {
  provider: AiProvider;
  systemInstruction: string;
  userPrompt: string;
  imageDataUrl?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { provider, systemInstruction, userPrompt, imageDataUrl, signal } = params;
  const model = provider.selectedModelId.trim();
  if (!model) {
    throw new Error('请先填写或选择一个模型 ID');
  }

  const url = resolveProviderUrl(provider, 'generate');
  const maxTokens = provider.maxOutputTokens || 4096;
  const match = imageDataUrl?.match(/^data:([^;]+);base64,(.+)$/);

  let body: Record<string, unknown>;
  if (provider.protocol === 'anthropic') {
    body = {
      model,
      max_tokens: maxTokens,
      system: systemInstruction,
      messages: [
        {
          role: 'user',
          content: [
            ...(match
              ? [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: match[1],
                      data: match[2],
                    },
                  },
                ]
              : []),
            { type: 'text', text: userPrompt },
          ],
        },
      ],
    };
  } else if (provider.protocol === 'openai_responses') {
    body = {
      model,
      instructions: systemInstruction,
      max_output_tokens: maxTokens,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: userPrompt },
            ...(imageDataUrl
              ? [{ type: 'input_image', image_url: imageDataUrl }]
              : []),
          ],
        },
      ],
    };
  } else {
    body = {
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemInstruction },
        {
          role: 'user',
          content: imageDataUrl
            ? [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: imageDataUrl } },
              ]
            : userPrompt,
        },
      ],
    };
  }

  const raw = (await smartProviderRequest(
    provider,
    url,
    'POST',
    body,
    signal
  )) as Record<string, unknown>;

  if (provider.protocol === 'anthropic') {
    const blocks = Array.isArray(raw.content) ? raw.content : [];
    const text = blocks
      .filter((b: { type?: string }) => b?.type === 'text')
      .map((b: { text?: string }) => b.text || '')
      .join('')
      .trim();
    if (!text) throw new Error('Anthropic 未返回可用文本');
    return text;
  }

  if (provider.protocol === 'openai_responses') {
    if (typeof raw.output_text === 'string' && raw.output_text.trim()) {
      return raw.output_text.trim();
    }
    const output = Array.isArray(raw.output) ? raw.output : [];
    const text = output
      .flatMap((o: { content?: { type?: string; text?: string }[] }) =>
        Array.isArray(o?.content) ? o.content : []
      )
      .filter((c) => c?.type === 'output_text')
      .map((c) => c.text || '')
      .join('')
      .trim();
    if (!text) throw new Error('Responses API 未返回可用文本');
    return text;
  }

  const choices = Array.isArray(raw.choices) ? raw.choices : [];
  const first = (choices[0] as { message?: { content?: unknown } })?.message?.content;
  const text =
    typeof first === 'string'
      ? first.trim()
      : Array.isArray(first)
      ? first
          .map((p: { text?: string }) => p?.text || '')
          .join('')
          .trim()
      : '';

  if (!text) throw new Error('模型未返回可用文本内容');
  return text;
}

export async function testProviderConnection(
  provider: AiProvider,
  mode: 'vision' | 'text',
  signal?: AbortSignal
): Promise<{ latencyMs: number; preview: string; model: string }> {
  const started = performance.now();

  if (provider.protocol === 'studio_gemini') {
    if (mode === 'text') {
      const res = await fetch('/api/health', { signal });
      const data = await res.json();
      if (!res.ok || !data.hasGeminiKey) {
        throw new Error('Studio Gemini 服务端密钥尚未就绪');
      }
      return {
        latencyMs: Math.round(performance.now() - started),
        preview: 'Studio Gemini (gemini-4-hydrogen) ready',
        model: 'gemini-4-hydrogen',
      };
    }

    const res = await fetch('/api/prompts/compile-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        imageBase64: TEST_PNG_BASE64,
        mimeType: 'image/png',
        targetModel: 'krea2',
        kreaVariant: 'turbo',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Vision check failed');
    return {
      latencyMs: Math.round(performance.now() - started),
      preview: String(data.prompt || '').slice(0, 180),
      model: 'gemini-4-hydrogen',
    };
  }

  const preview = await invokeExternalProvider({
    provider,
    systemInstruction: 'You are a concise diagnostic assistant.',
    userPrompt:
      mode === 'vision'
        ? 'Describe the dominant color of this solid square image in 3-6 English words.'
        : 'Reply with OK only.',
    imageDataUrl:
      mode === 'vision' ? `data:image/png;base64,${TEST_PNG_BASE64}` : undefined,
    signal,
  });

  return {
    latencyMs: Math.round(performance.now() - started),
    preview: preview.slice(0, 180),
    model: provider.selectedModelId,
  };
}
