export type TargetModelId =
  | 'krea2'
  | 'moss_prose'
  | 'moss_layout'
  | 'flux_dit'
  | 'anima'
  | 'lora_hybrid'
  | 'danbooru_tags';

export type KreaVariant = 'turbo' | 'medium' | 'large';

export type WorkspaceTab = 'workspace' | 'prompt-lab' | 'preprocess' | 'review' | 'export';

export type Language = 'zh' | 'en';

export type ThemeMode = 'light' | 'dark';

export type AspectBucket = 'all' | 'landscape' | 'portrait' | 'square';

export type ImageStatus = 'idle' | 'loading' | 'success' | 'error';

export type ProviderProtocol =
  | 'studio_gemini'
  | 'openai_compatible'
  | 'openai_responses'
  | 'anthropic';

export type AuthMode = 'auto' | 'bearer' | 'x-api-key' | 'api-key' | 'none';

export interface AiProvider {
  id: string;
  name: string;
  protocol: ProviderProtocol;
  baseUrl: string;
  apiKey: string;
  authMode: AuthMode;
  selectedModelId: string;
  availableModels: string[];
  maxOutputTokens: number;
  isBuiltIn?: boolean;
}

export interface SpecTuningConfig {
  density: 'concise' | 'balanced' | 'exhaustive';
  emphasizeMaterials: boolean;
  quoteTypography: boolean;
  includeOpticalLens: boolean;
  includeArtistOrMedium: boolean;
  purePositiveOnly: boolean;
  extraDirective: string;
  systemPromptOverride?: string;
}

export interface CustomPromptPreset {
  id: string;
  name: string;
  baseModel: TargetModelId;
  kreaVariant?: KreaVariant;
  tuning: SpecTuningConfig;
  promptTemplate: string;
}

export interface MossElement {
  id: string;
  label: string;
  category: 'subject' | 'object' | 'typography' | 'environment' | 'lighting' | string;
  description: string;
  bbox: [number, number, number, number];
  text_content?: string;
}

export interface MossLayoutSpec {
  model: 'moss-image';
  aspect_ratio: string;
  prompt: string;
  layout: MossElement[];
  sampler_hint?: {
    sampler: string;
    steps: number;
    cfg_scale: number;
    shift: number;
  };
}

export interface DatasetItem {
  id: string;
  name: string;
  previewUrl: string;
  mimeType: string;
  width: number;
  height: number;
  status: ImageStatus;
  caption: string;
  targetModel: TargetModelId;
  kreaVariant?: KreaVariant;
  presetId?: string;
  layoutSpec?: MossLayoutSpec;
  error?: string;
  isSample?: boolean;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  triggerWord: string;
  targetModel: TargetModelId;
  items: DatasetItem[];
  createdAt: number;
}

export interface ReplacementRule {
  pattern: string;
  replace: string;
}

export interface AppSettings {
  theme: ThemeMode;
  language: Language;
  defaultTargetModel: TargetModelId;
  kreaVariant: KreaVariant;
  viewMode: 'grid' | 'list';
  gridColumns: number;
  concurrency: number;
  customInstruction: string;
  blockedWords: string[];
  replacementRules: ReplacementRule[];
  providers: AiProvider[];
  activeProviderId: string;
  modelTunings: Partial<Record<TargetModelId, SpecTuningConfig>>;
  customPresets: CustomPromptPreset[];
  activePresetId?: string | null;
}

export interface ModernizeResult {
  compiledPrompt: string;
  layoutSpec?: MossLayoutSpec;
  strippedBuzzwords: string[];
  anatomy: { layer: string; detail: string }[];
}
