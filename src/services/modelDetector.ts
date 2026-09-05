import { DetectedModel, ModelCapability, AiProtocol } from '../types';

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
    /(vision|image|vl\b|vl-|\b4o\b|4o-|gemini|claude-3|qwen2\.5-vl|qwen-vl|minicpm-v|internvl|pixtral|llava|omni|florence|joycaption|deepseek-vl|glm-4v|yi-vl|step-1v|cogvlm)/i.test(
      id
    ) ||
    /(image|vision|multimodal)/i.test(desc) ||
    meta?.architecture?.modality?.includes('image') ||
    false;

  if (isVision) {
    caps.add('vision');
  }

  // 2. REASONING / DEEP THINKING Capability
  const isReasoning =
    /(\bo1\b|\bo1-|\bo3\b|\bo3-|\br1\b|\br1-|_r1|reasoning|thinking|deepseek-r1|qwq)/i.test(
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
    /(audio|voice|tts|whisper|realtime|gemini-1\.5|gemini-2\.0|gemini-2\.5|gpt-4o-audio|speech)/i.test(
      id
    ) || /(audio|speech)/i.test(desc);

  if (isAudio) {
    caps.add('audio');
  }

  // 5. TOOLS / FUNCTION CALLING Capability
  const isTools =
    /(gpt-4|gpt-3\.5|claude|gemini|qwen|deepseek|mistral|llama-3|glm-4|function)/i.test(
      id
    ) && !/(embedding|embed|rerank|whisper|tts)/i.test(id);

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
  if (id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('dall-e')) return 'openai';
  if (id.includes('claude')) return 'anthropic';
  if (id.includes('qwen')) return 'qwen';
  if (id.includes('deepseek')) return 'deepseek';
  if (id.includes('llama')) return 'meta-llama';
  if (id.includes('mistral') || id.includes('mixtral')) return 'mistral';
  if (id.includes('glm') || id.includes('cog')) return 'zhipu-ai';
  if (id.includes('llava') || id.includes('internvl') || id.includes('florence') || id.includes('joycaption')) return 'open-vision';
  return 'other';
};

/**
 * Fetch and detect models for Google Gemini
 */
export const fetchGoogleModels = async (apiKey: string): Promise<DetectedModel[]> => {
  if (!apiKey) throw new Error('API Key is required to fetch models');

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(apiUrl);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google API Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (!data.models || !Array.isArray(data.models)) {
    throw new Error('Unexpected response format from Google Gemini API');
  }

  return data.models
    .filter((m: { supportedGenerationMethods?: string[] }) => {
      // Filter models that support content generation
      return m.supportedGenerationMethods?.includes('generateContent') ?? true;
    })
    .map((m: { name: string; displayName?: string; description?: string; supportedGenerationMethods?: string[] }) => {
      const id = m.name.replace(/^models\//, '');
      const capabilities = detectModelCapabilities(id, {
        description: m.description,
        supportedGenerationMethods: m.supportedGenerationMethods
      });

      return {
        id,
        name: m.displayName || id,
        capabilities,
        description: m.description,
        group: getModelGroup(id)
      };
    })
    .sort((a: DetectedModel, b: DetectedModel) => a.id.localeCompare(b.id));
};

/**
 * Fetch and detect models for OpenAI-compatible endpoints (including SiliconFlow, Ollama, OneAPI, OpenRouter, etc.)
 */
export const fetchOpenAiModels = async (
  baseUrl: string,
  apiKey: string,
  customHeaders?: { key: string; value: string }[]
): Promise<DetectedModel[]> => {
  if (!baseUrl) throw new Error('Base URL is required');

  const rawBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  let apiUrl = rawBaseUrl;

  if (apiUrl.endsWith('/chat/completions')) {
    apiUrl = apiUrl.replace('/chat/completions', '/models');
  } else if (apiUrl.endsWith('/v1')) {
    apiUrl = `${apiUrl}/models`;
  } else {
    apiUrl = `${apiUrl}/v1/models`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (customHeaders) {
    customHeaders.forEach(h => {
      if (h.key && h.value) {
        headers[h.key] = h.value;
      }
    });
  }

  const res = await fetch(apiUrl, { headers });
  if (!res.ok) {
    let errMsg = res.statusText;
    try {
      const errJson = await res.json();
      errMsg = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    throw new Error(`API Error (${res.status}): ${errMsg}`);
  }

  const data = await res.json();
  const rawList: Array<{ id: string; name?: string; description?: string }> = Array.isArray(data.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : [];

  if (rawList.length === 0) {
    throw new Error('No models found at this endpoint');
  }

  return rawList
    .filter(item => Boolean(item.id))
    .map(item => {
      const id = item.id;
      const capabilities = detectModelCapabilities(id, { description: item.description });

      return {
        id,
        name: item.name || id,
        capabilities,
        description: item.description,
        group: getModelGroup(id)
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
};

/**
 * Unified model fetcher dispatching to the right protocol
 */
export const fetchProviderModels = async (
  protocol: AiProtocol,
  baseUrl: string,
  apiKey: string,
  customHeaders?: { key: string; value: string }[]
): Promise<DetectedModel[]> => {
  if (protocol === 'google') {
    return await fetchGoogleModels(apiKey);
  } else {
    return await fetchOpenAiModels(baseUrl, apiKey, customHeaders);
  }
};
