
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

export type AiProtocol = 'google' | 'openai_compatible';

export interface PromptTemplate {
  id: string;
  label: string;
  value: string;
}

export interface AppSettings {
  language: 'en' | 'zh';
  theme: 'light' | 'dark'; // New theme setting
  viewMode: 'grid' | 'list'; // New view mode setting
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
}

export enum WorkflowStep {
  IMPORT = 'import',
  PREPROCESS = 'preprocess',
  TAGGING = 'tagging',
  REVIEW = 'review',
  EXPORT = 'export'
}

export const DEFAULT_PROMPT = "Analyze this image for a LoRA training dataset. Provide a hybrid description combining core Danbooru-style tags and detailed natural language.\nRules:\n1. First part: Output the most important Danbooru tags representing the character, hairstyle, and key outfits, separated by commas (e.g., \"1girl, solo, short_hair, blue_skirt\").\n2. Second part: Followed by a comma, write a descriptive natural language sentence detailing the action, specific pose, background scene, and lighting.\n3. DO NOT use quality modifiers like masterpiece, best quality.\nFormat: tag1, tag2, [natural language description]";

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'default-danbooru',
    label: "Danbooru Tags (纯标签)",
    value: "Analyze the image and provide a list of precise, comma-separated Danbooru-style tags.\nRules:\n1. Use ONLY Danbooru tags (e.g., 1girl, blue_hair, pleated_skirt, holding_book).\n2. All tags must be lowercase, and spaces must be replaced with underscores.\n3. Identify character features, hairstyle, clothing, pose, and background elements.\n4. DO NOT include quality modifiers (e.g. masterpiece, best quality) or natural language sentences.\nFormat: tag1, tag2, tag3..."
  },
  {
    id: 'default-caption',
    label: "Natural Language (纯自然语言)",
    value: "Describe this image in a detailed, objective, and realistic natural language paragraph for AI training.\nRules:\n1. Start directly with the main subject and their action (e.g., \"A photograph of a young woman with blue hair sitting at a desk...\").\n2. Describe details in order: subject (clothing, expression, hairstyle, posture), immediate surroundings, background elements, lighting, and style.\n3. Avoid quality buzzwords (e.g. masterpiece, photorealistic, ultra-detailed) and subjective emotional opinions. Keep the description flowing naturally as a coherent paragraph."
  },
  {
    id: 'default-optimal',
    label: "Optimal Mixed (双混合模式 - 推荐)",
    value: "Analyze this image for a LoRA training dataset. Provide a hybrid description combining core Danbooru-style tags and detailed natural language.\nRules:\n1. First part: Output the most important Danbooru tags representing the character, hairstyle, and key outfits, separated by commas (e.g., \"1girl, solo, short_hair, blue_skirt\").\n2. Second part: Followed by a comma, write a descriptive natural language sentence detailing the action, specific pose, background scene, and lighting.\n3. DO NOT use quality modifiers like masterpiece, best quality.\nFormat: tag1, tag2, [natural language description]"
  },
];
