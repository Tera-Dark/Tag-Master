export interface TagImage {
  id: string;
  file: File;
  originalFile?: File; // Backup for reset in preprocessing
  previewUrl: string;
  caption: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMsg?: string;
}

export interface Project {
  id: string;
  name: string;
  images: TagImage[];
  status: 'idle' | 'processing' | 'completed'; // Derived from images
  isCollapsed?: boolean;
  triggerWord?: string;
}

export type AiProtocol = 'google' | 'openai_compatible' | 'openai_responses' | 'anthropic';

export type CaptionFormat = 'tags' | 'caption' | 'hybrid' | 'custom';
export interface ApiConnectionOptions {
  endpointMode?: 'auto' | 'exact';
  modelsUrl?: string;
  authMode?: 'auto' | 'bearer' | 'x-api-key' | 'api-key' | 'none';
  requestTimeoutSec?: number;
  maxOutputTokens?: number;
  requestBody?: Record<string, unknown>;
  requestBodyJson?: string;
}

// Recognized model capability categories (Aligned with Cherry Studio)
export type ModelCapability = 'vision' | 'text' | 'reasoning' | 'video' | 'audio' | 'tools';

export interface DetectedModel {
  enabled?: boolean;
  visionMode?: 'auto' | 'enabled' | 'disabled';
  source?: 'preset' | 'remote' | 'manual';
  capabilitySource?: 'inferred' | 'provider' | 'manual';
  id: string;
  name: string;
  capabilities: ModelCapability[];
  description?: string;
  contextLength?: number;
  group?: string; // Grouping like 'gemini', 'gpt', 'qwen', 'claude', 'deepseek', etc.
}

export interface AiProvider extends ApiConnectionOptions {
  selectedModelId?: string;
  enabled?: boolean;
  catalogVersion?: number;
  id: string;
  name: string;
  protocol: AiProtocol;
  baseUrl: string;
  apiKey: string;
  avatar?: string;
  avatarBg?: string;
  avatarColor?: string;
  models?: DetectedModel[];
  customHeaders?: { key: string; value: string }[];
  isSystem?: boolean;
}

export interface PromptTemplate {
  format?: CaptionFormat;
  example?: string;
  id: string;
  label: string;
  value: string;
  mode?: 'Mode A' | 'Mode B' | 'Mode C' | 'Mode D' | string;
  description?: string;
}

export type RateLimitPreset = 'unlimited' | 'google_5rpm' | 'google_15rpm' | 'custom';

export interface AppSettings extends ApiConnectionOptions {
  captionFormat?: CaptionFormat;
  promptPresetId?: string;
  configVersion?: number;
  language: 'en' | 'zh';
  theme: 'light' | 'dark';
  viewMode: 'grid' | 'list';
  protocol: AiProtocol;
  providerName: string;
  apiKey: string;
  baseUrl: string; // Used for OpenAI compatible
  model: string;
  activePrompt: string;
  concurrency: number;
  customTemplates: PromptTemplate[];
  gridColumns: number;
  blockedWords: string[];
  replacementRules: { pattern: string; replace: string }[];
  customHeaders?: { key: string; value: string }[];
  workflowStep?: WorkflowStep;
  // Multi-provider extension
  providers?: AiProvider[];
  activeProviderId?: string;
  // Rate limiting & Pacing
  rateLimitPreset?: RateLimitPreset;
  requestIntervalSec?: number;
}

export enum WorkflowStep {
  IMPORT = 'import',
  PREPROCESS = 'preprocess',
  TAGGING = 'tagging',
  REVIEW = 'review',
  EXPORT = 'export',
}

// Dataset-focused prompts. Output examples are UI-only, never sent as few-shot subjects.
const OBSERVATION_RULES = `You annotate images for a training dataset. Describe only directly visible content.
Do not invent identities, locations, narratives, camera settings, hidden details, or attributes that cannot be determined from the image. Omit uncertain details rather than guessing.
Prioritize the main subject, visible appearance, pose or action, clothing or objects, composition, background, lighting, and medium when evident.
Do not add quality or popularity tags such as masterpiece, best quality, score_9, 8k, or award winning. Do not add negative prompts, generation parameters, markdown, explanations, or commentary.
Do not infer a person's ethnicity, religion, health, or identity from appearance. Include only visible details relevant to the image.`;

export const PROMPT_MODE_B = `${OBSERVATION_RULES}

OUTPUT FORMAT: One line of concise lowercase English tags separated by a comma and a space. Use natural spaces within multiword tags. Use established visual tags when applicable, but do not force an image into anime-specific categories.
Order tags from the main subject and visible attributes to pose, objects, composition, background, and lighting. Avoid synonyms and repeated tags. Use as many tags as are supported by the image; there is no minimum tag count.
Return only the tag line. No headings, sentences, JSON, or code fences.`;

export const PROMPT_MODE_D = `${OBSERVATION_RULES}

OUTPUT FORMAT: One factual English paragraph, generally 50–120 words, shorter when the image is simple. Start with the main subject and action, then include distinguishing visible details and the surrounding scene. Use plain descriptive language rather than promotional or poetic prose.
Return only the paragraph. No tag list, headings, bullets, JSON, or code fences.`;

export const PROMPT_MODE_A = `${OBSERVATION_RULES}

OUTPUT FORMAT: Exactly two blocks separated by one blank line.
Block 1: One line of concise lowercase English visual tags separated by a comma and a space. Use natural spaces within multiword tags. No forced minimum count.
Block 2: One factual English paragraph describing the same visible content in natural language, without introducing new speculative details.
Return only these two blocks. No headings, labels, bullets, JSON, or code fences.`;

// Kept as a public alias for older integrations; no image-generation parameters in dataset captions.
export const PROMPT_MODE_C = PROMPT_MODE_D;
export const DEFAULT_PROMPT = PROMPT_MODE_B;

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'dataset-tags-v3',
    label: '纯标签',
    format: 'tags',
    mode: 'Tags',
    description: '通用 LoRA / SDXL 标注。单行逗号分隔，只描述可见内容，不强凑标签数量。',
    value: PROMPT_MODE_B,
    example: 'ceramic vase, oval opening, beige background, centered composition, soft lighting',
  },
  {
    id: 'dataset-caption-v3',
    label: '自然语言',
    format: 'caption',
    mode: 'Caption',
    description: '适合需要自然语言描述的数据集。一个简洁、客观的英文段落。',
    value: PROMPT_MODE_D,
    example:
      'A ceramic vase stands in the center of a plain beige scene. Its rounded body narrows toward an oval opening. Soft light creates a subtle shadow beside the vase.',
  },
  {
    id: 'dataset-hybrid-v3',
    label: '标签 + 描述',
    format: 'hybrid',
    mode: 'Hybrid',
    description: '明确需要混合格式时使用。第一行标签，空一行后附自然语言描述。',
    value: PROMPT_MODE_A,
    example:
      'ceramic vase, beige background, centered composition, soft lighting\n\nA ceramic vase stands against a plain beige background, with soft lighting across its rounded body.',
  },
];

/** Shared contract for caption editing controls and project state updates. */
export interface BatchCaptionParams {
  find?: string;
  replace?: string;
  prefix?: string;
  suffix?: string;
  tags?: string[];
  rules?: { pattern: string; replace: string }[];
}
