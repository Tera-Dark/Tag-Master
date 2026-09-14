import { AiProvider, AiProtocol, AppSettings } from '../../types';
import { smartFetch } from '../networkUtils';
import {
  ApiErrorData,
  isRateLimitResponse,
  parseRetryAfter,
  ProviderError,
  RateLimitError,
} from './errors';

export type Connection = Pick<
  AiProvider,
  | 'protocol'
  | 'baseUrl'
  | 'apiKey'
  | 'customHeaders'
  | 'authMode'
  | 'endpointMode'
  | 'modelsUrl'
  | 'requestTimeoutSec'
  | 'maxOutputTokens'
  | 'requestBody'
  | 'requestBodyJson'
>;
export const PROTOCOL_LABELS: Record<AiProtocol, string> = {
  google: 'Gemini · GenerateContent',
  openai_compatible: 'OpenAI · Chat Completions',
  openai_responses: 'OpenAI · Responses',
  anthropic: 'Anthropic · Messages',
};
export const DEFAULT_URLS: Record<AiProtocol, string> = {
  google: 'https://generativelanguage.googleapis.com/v1beta',
  openai_compatible: 'https://api.openai.com/v1',
  openai_responses: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
};
const paths: Record<AiProtocol, string> = {
  google: '',
  openai_compatible: '/chat/completions',
  openai_responses: '/responses',
  anthropic: '/messages',
};
const knownEndpoint =
  /\/(?:chat\/completions|responses|messages|models(?:\/[^/]+:generateContent)?)$/;

function checkedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ProviderError('API 地址必须是完整的 http(s) URL。');
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash)
    throw new ProviderError('API 地址仅支持 HTTP(S)，不能包含账号、密码或 # 片段。');
  for (const key of url.searchParams.keys()) {
    if (/^(key|api[_-]?key|access[_-]?token|token)$/i.test(key))
      throw new ProviderError('请把密钥放在 API Key 或请求头中，不要放在 URL 查询参数里。');
  }
  return url;
}

/** Host roots get a protocol version; supplied paths are preserved as API prefixes. */
export function resolveEndpoint(c: Connection, kind: 'generate' | 'models', model = ''): string {
  if (!(c.protocol in DEFAULT_URLS)) throw new ProviderError('未知 API 协议，请重新选择连接协议。');
  const url = checkedUrl(c.baseUrl || DEFAULT_URLS[c.protocol]);
  if (kind === 'models' && c.modelsUrl?.trim()) {
    const override = checkedUrl(c.modelsUrl);
    if (override.origin !== url.origin)
      throw new ProviderError('模型列表地址必须与 API 地址同源，避免将凭证发送到另一站点。');
    return override.toString();
  }
  const path = url.pathname.replace(/\/+$/, '');
  const fullGenerate =
    /\/(chat\/completions|responses|messages|models\/[^/]+:generateContent)$/.test(path);
  if (kind === 'generate' && fullGenerate && c.endpointMode !== 'exact') {
    const expected =
      c.protocol === 'google'
        ? /:generateContent$/
        : c.protocol === 'anthropic'
          ? /\/messages$/
          : c.protocol === 'openai_responses'
            ? /\/responses$/
            : /\/chat\/completions$/;
    if (!expected.test(path))
      throw new ProviderError(
        '完整调用地址与所选协议不匹配。请更换协议或 API 地址；特殊网关可使用完整端点模式。'
      );
    url.pathname = path;
  }
  if (kind === 'generate' && (c.endpointMode === 'exact' || fullGenerate)) {
    if (c.protocol === 'google' && /\/models\/[^/]+:generateContent$/.test(path)) {
      url.pathname = path.replace(
        /\/models\/[^/]+:generateContent$/,
        `/models/${encodeURIComponent(model.replace(/^models\//, ''))}:generateContent`
      );
    }
    return url.toString();
  }
  if (kind === 'models' && c.endpointMode === 'exact' && !knownEndpoint.test(path))
    throw new ProviderError(
      '完整端点模式无法推断模型地址，请在高级设置填写模型列表 URL，或手动添加模型。'
    );
  let prefix = path.replace(knownEndpoint, '');
  if (!prefix) prefix = c.protocol === 'google' ? '/v1beta' : '/v1';
  url.pathname =
    kind === 'models'
      ? `${prefix}/models`
      : c.protocol === 'google'
        ? `${prefix}/models/${encodeURIComponent(model.replace(/^models\//, ''))}:generateContent`
        : `${prefix}${paths[c.protocol]}`;
  return url.toString();
}

export function buildHeaders(c: Connection): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
  const auth = c.authMode || 'auto';
  const key = c.apiKey.trim();
  if (/[\r\n]/.test(key)) throw new ProviderError('API Key 不能包含换行符。');
  if (key && auth !== 'none') {
    if (auth === 'bearer' || (auth === 'auto' && c.protocol.startsWith('openai')))
      headers.set('Authorization', `Bearer ${key}`);
    else
      headers.set(
        auth === 'auto' ? (c.protocol === 'google' ? 'x-goog-api-key' : 'x-api-key') : auth,
        key
      );
  }
  if (c.protocol === 'anthropic') {
    headers.set('anthropic-version', '2023-06-01');
    headers.set('anthropic-dangerous-direct-browser-access', 'true');
  }
  for (const { key: name, value } of c.customHeaders || []) {
    if (!name.trim()) continue;
    if (/^(host|cookie|origin|referer|content-length|connection|sec-.+)$/i.test(name.trim()))
      throw new ProviderError(`浏览器不允许自定义请求头 ${name.trim()}。`);
    try {
      headers.set(name.trim(), value);
    } catch {
      throw new ProviderError('请求头名称或内容无效，请检查换行符和特殊字符。');
    }
  }
  return headers;
}

export function extraBody(c: Connection): Record<string, unknown> {
  if (c.requestBodyJson === undefined) return c.requestBody || {};
  try {
    const value: unknown = JSON.parse(c.requestBodyJson.trim() || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new ProviderError('自定义请求参数必须是有效的 JSON 对象。');
  }
}

export function connectionProblem(c: Connection, model?: string): string | null {
  try {
    if (!c.baseUrl.trim()) return '请填写 API 地址，避免将密钥发送到意外的默认服务。';
    resolveEndpoint(c, 'generate', model || 'MODEL_ID');
    const headers = buildHeaders(c);
    if (
      (c.authMode || 'auto') !== 'none' &&
      !['authorization', 'x-api-key', 'x-goog-api-key', 'api-key'].some((k) =>
        headers.get(k)?.trim()
      )
    )
      return '请填写 API Key；本地免密服务请在高级设置选择「无需鉴权」。';
    if (model !== undefined && !model.trim()) return '请先选择或手动添加一个打标模型。';
    if (
      c.requestTimeoutSec !== undefined &&
      (!Number.isFinite(c.requestTimeoutSec) ||
        c.requestTimeoutSec < 5 ||
        c.requestTimeoutSec > 600)
    )
      return '请求超时应为 5–600 秒。';
    if (
      c.maxOutputTokens !== undefined &&
      (!Number.isInteger(c.maxOutputTokens) || c.maxOutputTokens < 64 || c.maxOutputTokens > 131072)
    )
      return '输出上限应为 64–131072 的整数。';
    const body = extraBody(c);
    if (['model', 'messages', 'contents', 'input'].some((k) => k in body))
      return '自定义参数不能覆盖 model / messages / contents / input。';
    if ('stream' in body && body.stream !== false)
      return '当前打标仅支持非流式响应，不能启用 stream。';
  } catch (err) {
    return redact((err as Error).message, c);
  }
  return null;
}

export function activeConnection(settings: AppSettings): AppSettings {
  const p = settings.providers?.find((item) => item.id === settings.activeProviderId);
  if (!p) return settings;
  return {
    ...settings,
    protocol: p.protocol,
    baseUrl: p.baseUrl,
    apiKey: p.apiKey,
    providerName: p.name,
    customHeaders: p.customHeaders,
    authMode: p.authMode,
    endpointMode: p.endpointMode,
    modelsUrl: p.modelsUrl,
    requestTimeoutSec: p.requestTimeoutSec,
    maxOutputTokens: p.maxOutputTokens,
    requestBody: p.requestBody,
    requestBodyJson: p.requestBodyJson,
    model: p.selectedModelId ?? settings.model,
  };
}

export function taggingProblem(settings: AppSettings): string | null {
  const s = activeConnection(settings);
  const p = s.providers?.find((p) => p.id === s.activeProviderId);
  if (s.providers !== undefined && !p) return '请先设置当前打标服务商。';
  if (p?.enabled === false) return '当前服务商已停用。';
  const m = p?.models?.find((m) => m.id === s.model);
  if (m?.enabled === false || m?.visionMode === 'disabled')
    return '当前模型已停用或已标记为不支持图片。';
  if (!s.activePrompt.trim()) return '打标提示词不能为空。';
  return connectionProblem(s, s.model);
}

export function redact(message: string, c: Connection): string {
  let safe = message;
  const secrets = [c.apiKey, ...(c.customHeaders || []).map((h) => h.value)].filter(
    (v) => v.length > 3
  );
  for (const value of secrets) {
    safe = safe.split(value).join('[REDACTED]').split(encodeURIComponent(value)).join('[REDACTED]');
  }
  return safe.slice(0, 900);
}

/** One attempt only. Batch retry/cooldown belongs to useTagProcessor. Timeout covers body reading too. */
export async function requestJson(
  c: Connection,
  url: string,
  init: RequestInit = {},
  signal?: AbortSignal
): Promise<Record<string, unknown> | unknown[]> {
  const problem = connectionProblem(c);
  if (problem) throw new ProviderError(problem);
  if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');
  const controller = new AbortController();
  let timedOut = false;
  const timeout = c.requestTimeoutSec ?? 90;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout * 1000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await smartFetch(url, {
      ...init,
      headers: buildHeaders(c),
      signal: controller.signal,
      redirect: 'error',
    });
    const text = await response.text();
    let data: Record<string, unknown> | unknown[];
    try {
      data = JSON.parse(text);
    } catch {
      if (response.status === 429)
        throw new RateLimitError('HTTP 429：服务商限流，请稍后重试。', parseRetryAfter(response));
      throw new ProviderError(
        `HTTP ${response.status}：服务未返回 JSON。请检查 API 路径，不能填写网页或登录地址。`,
        response.status,
        response.status >= 500
      );
    }
    if (!response.ok) {
      const errorData = data as ApiErrorData;
      const raw =
        errorData.error?.message ||
        (typeof errorData.error === 'string' ? errorData.error : response.statusText);
      const msg = redact(String(raw), c);
      if (isRateLimitResponse(response.status, msg, errorData))
        throw new RateLimitError(
          `HTTP ${response.status}：${msg}`,
          parseRetryAfter(response, errorData)
        );
      const hint =
        response.status === 401 || response.status === 403
          ? '检查鉴权方式、密钥及模型权限。'
          : response.status === 404
            ? '检查协议、端点和模型 ID；列表接口可用不代表该模型可调用。'
            : response.status === 400 || response.status === 422
              ? '检查模型的图片支持、输出上限及自定义参数。'
              : '';
      throw new ProviderError(
        `HTTP ${response.status}：${msg} ${hint}`,
        response.status,
        response.status >= 500
      );
    }
    if (!data || typeof data !== 'object')
      throw new ProviderError('API 返回格式无效：预期 JSON 对象。');
    return data;
  } catch (err) {
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');
    if (timedOut)
      throw new ProviderError(`请求超时 (${timeout}s)。可在高级设置调整；不会自动重发本次测试。`);
    if (err instanceof TypeError)
      throw new ProviderError(
        '网络或 CORS 连接失败。请检查服务地址、浏览器跨域许可及 HTTPS/HTTP 混合内容限制；本地地址指当前浏览器所在电脑。'
      );
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
