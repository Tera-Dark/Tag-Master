import { DetectedModel, ModelCapability, AiProtocol } from '../types';
import { Connection, DEFAULT_URLS, requestJson, resolveEndpoint } from './providers/connection';
import { object } from './providers/generation';
import { ProviderError } from './providers/errors';

/**
 * Intelligent capability detector for AI models.
 * Combines pattern matching on model naming conventions with any provider metadata.
 */
export const detectModelCapabilities = (
  modelId: string,
  meta?: {
    supportedGenerationMethods?: string[];
    description?: string;
    architecture?: { modality?: string };
  }
): ModelCapability[] => {
  const id = modelId.toLowerCase();
  const desc = (meta?.description || '').toLowerCase();
  const caps = new Set<ModelCapability>();

  // Default: Almost all generative models support text
  caps.add('text');

  // 1. VISION Capability (Critical for dataset tagging)
  const isVision =
    /(gpt-5|gpt-4\.1|gpt-4\.5|claude-(?:sonnet|opus|haiku)-[4-9]|o[34](?:-|$)|vision|vl\b|vl-|\b4o\b|4o-|gemini|claude-3|qwen2\.5-vl|qwen-vl|minicpm-v|internvl|pixtral|llava|omni|florence|joycaption|deepseek-vl|glm-4v|yi-vl|step-1v|cogvlm)/i.test(
      id
    ) ||
    /(image|vision|multimodal)/i.test(desc) ||
    meta?.architecture?.modality?.includes('image') ||
    false;

  if (isVision && !isNonTaggingModel(id)) {
    caps.add('vision');
  }

  // 2. REASONING / DEEP THINKING Capability
  const isReasoning =
    /(gpt-5|gemini-3|\bo1\b|\bo1-|\bo3\b|\bo3-|\br1\b|\br1-|_r1|reasoning|thinking|deepseek-r1|qwq)/i.test(
      id
    ) || /(reasoning|thinking)/i.test(desc);

  if (isReasoning) {
    caps.add('reasoning');
  }

  // 3. VIDEO Capability
  const isVideo =
    /(video|wan\b|wan2|hunyuan-video|cogvideox|ltx|sora|kling|gen-3)/i.test(id) ||
    /(video)/i.test(desc);

  if (isVideo) {
    caps.add('video');
  }

  // 4. AUDIO / SPEECH Capability
  const isAudio =
    /(audio|voice|tts|whisper|realtime|gemini-1\.5|gemini-2\.0|gemini-2\.5|gemini-3|gpt-4o-audio|speech)/i.test(
      id
    ) || /(audio|speech)/i.test(desc);

  if (isAudio) {
    caps.add('audio');
  }

  // 5. TOOLS / FUNCTION CALLING Capability
  const isTools =
    /(gpt-4|gpt-3\.5|claude|gemini|qwen|deepseek|mistral|llama-3|glm-4|function)/i.test(id) &&
    !/(embedding|embed|rerank|whisper|tts)/i.test(id);

  if (isTools) {
    caps.add('tools');
  }

  return Array.from(caps);
};

/**
 * Derives a group name for the model (e.g. 'gemini', 'openai', 'anthropic', 'qwen', 'deepseek')
 */
export const getModelGroup = (modelId: string): string => {
  const id = modelId.toLowerCase();
  if (id.includes('gemini')) return 'gemini';
  if (id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('dall-e'))
    return 'openai';
  if (id.includes('claude')) return 'anthropic';
  if (id.includes('qwen')) return 'qwen';
  if (id.includes('deepseek')) return 'deepseek';
  if (id.includes('llama')) return 'meta-llama';
  if (id.includes('mistral') || id.includes('mixtral')) return 'mistral';
  if (id.includes('glm') || id.includes('cog')) return 'zhipu-ai';
  if (
    id.includes('llava') ||
    id.includes('internvl') ||
    id.includes('florence') ||
    id.includes('joycaption')
  )
    return 'open-vision';
  return 'other';
};

/** Exclude generators, embeddings and speech-only endpoints from image-to-text recommendations. */
export function isNonTaggingModel(id: string): boolean {
  return /(?:embedding|embed-|rerank|dall-e|gpt-image|imagen|flux|stable-diffusion|image-generation|text-to-image|tts|whisper|transcri|sora|wan[\d.-]|hunyuan-video|cogvideox|realtime|audio-preview|native-audio|gemini.*(?:image|tts))/.test(
    id.toLowerCase()
  );
}
export function visionStatus(model: DetectedModel): 'supported' | 'unsupported' | 'unknown' {
  if (model.visionMode === 'enabled') return 'supported';
  if (model.visionMode === 'disabled' || isNonTaggingModel(model.id)) return 'unsupported';
  if (model.capabilities.includes('vision')) return 'supported';
  return model.capabilitySource === 'provider' ? 'unsupported' : 'unknown';
}

export function modelFromRemote(raw: unknown, protocol: AiProtocol): DetectedModel | null {
  const item = object(raw);
  const rawId = item.id || item.name || item.model;
  if (typeof rawId !== 'string' || !rawId.trim()) return null;
  const id = protocol === 'google' ? rawId.replace(/^models\//, '') : rawId;
  const architecture = object(item.architecture);
  const input = item.input_modalities || architecture.input_modalities;
  const output = item.output_modalities || architecture.output_modalities;
  const modality =
    typeof architecture.modality === 'string' ? architecture.modality.split('->')[0] : undefined;
  const inputs = Array.isArray(input) ? input : modality?.split('+');
  const description = typeof item.description === 'string' ? item.description : '';
  let caps = detectModelCapabilities(id, { description });
  if (inputs) {
    caps = caps.filter((c) => c !== 'vision');
    if (inputs.includes('image') && (!Array.isArray(output) || output.includes('text')))
      caps.push('vision');
  }
  const name = item.displayName || item.display_name || (item.id ? item.name : '') || id;
  return {
    id,
    name: typeof name === 'string' ? name : id,
    description,
    capabilities: caps,
    group: getModelGroup(id),
    source: 'remote',
    capabilitySource: inputs ? 'provider' : 'inferred',
    contextLength:
      typeof (item.context_length ?? item.inputTokenLimit) === 'number'
        ? Number(item.context_length ?? item.inputTokenLimit)
        : undefined,
  };
}

/** A list is discovery, not proof of account access or image support. Never removes manually added models. */
export async function discoverModels(
  c: Connection,
  signal?: AbortSignal
): Promise<DetectedModel[]> {
  const initial = resolveEndpoint(c, 'models');
  const results = new Map<string, DetectedModel>();
  const seen = new Set<string>();
  let next = initial;
  for (let page = 0; page < 20; page++) {
    if (seen.has(next))
      throw new ProviderError('模型列表分页循环。可手动添加模型，或检查服务的分页响应。');
    seen.add(next);
    const raw = await requestJson(c, next, { method: 'GET' }, signal);
    const data = object(raw);
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(data.models)
        ? data.models
        : Array.isArray(data.data)
          ? data.data
          : undefined;
    if (!list)
      throw new ProviderError(
        '模型列表格式不兼容。可填写自定义列表 URL，或直接手动添加模型；不影响模型调用。'
      );
    for (const item of list) {
      const methods = object(item).supportedGenerationMethods;
      if (c.protocol === 'google' && Array.isArray(methods) && !methods.includes('generateContent'))
        continue;
      const model = modelFromRemote(item, c.protocol);
      if (model) results.set(model.id, model);
    }
    if (results.size > 10000)
      throw new ProviderError('模型列表超过 10,000 项，请使用更精确的模型列表端点或手动添加。');
    const token = data.nextPageToken;
    const cursor =
      data.next_cursor ||
      (data.has_more ? data.last_id || object(list[list.length - 1]).id : undefined);
    if (!token && !cursor) return [...results.values()].sort((a, b) => a.id.localeCompare(b.id));
    const url = new URL(initial);
    if (token) url.searchParams.set('pageToken', String(token));
    else url.searchParams.set(c.protocol === 'anthropic' ? 'after_id' : 'after', String(cursor));
    next = url.toString();
  }
  throw new ProviderError('模型列表超过 20 页，请缩小列表范围或手动添加模型。');
}

// Legacy exports retained for external callers, now sharing transport/auth/timeout logic.
export const fetchGoogleModels = (apiKey: string) =>
  discoverModels({ protocol: 'google', baseUrl: DEFAULT_URLS.google, apiKey });
export const fetchOpenAiModels = (
  baseUrl: string,
  apiKey: string,
  customHeaders?: Connection['customHeaders']
) =>
  discoverModels({
    protocol: 'openai_compatible',
    baseUrl,
    apiKey,
    customHeaders,
    authMode: apiKey ? 'auto' : 'none',
  });
export const fetchProviderModels = (
  protocol: AiProtocol,
  baseUrl: string,
  apiKey: string,
  customHeaders?: Connection['customHeaders']
) => discoverModels({ protocol, baseUrl, apiKey, customHeaders });
