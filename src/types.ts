
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

export const DEFAULT_PROMPT = "Describe this image in detail for an AI image generator training dataset. Focus on the subject, clothes, pose, background, lighting, and artistic style. Provide the output as comma-separated keywords.";

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'default-danbooru',
    label: "Danbooru Tags",
    value: "Analyze the image and provide a list of accurate Danbooru-style tags. 1. Character: Name (if known), gender, hair color/style, eye color, expression. 2. Appearance: Clothing items, accessories, physical features. 3. Pose: Action, camera angle, framing. 4. Background: Setting, objects, lighting. 5. Meta: Rating, style, quality. Format: tag1, tag2, tag3... (Use underscores for multi-word tags)"
  },
  {
    id: 'default-caption',
    label: "Natural Language",
    value: "Describe this image in a detailed, objective, and visual manner. Start with the main subject and their action, then describe their physical appearance (hair, eyes, skin), clothing details, and accessories. Proceed to describe the background, lighting, and color palette. Finish with the artistic style and medium. Avoid poetic language; focus on visual facts."
  },
  {
    id: 'default-sd',
    label: "Stable Diffusion",
    value: "Provide a high-quality Stable Diffusion prompt for this image. Start with quality boosters (masterpiece, best quality, highres). Then describe the subject (character, outfit, pose) using specific keywords. Add background and lighting details. End with artistic style tags (e.g. anime style, cel shaded, 4k). Format as comma-separated tags."
  },
  {
    id: 'default-optimal',
    label: "Optimal (Mixed)",
    value: "Analyze this image for a LoRA training dataset. Provide a mix of precise booru-style tags and descriptive natural language phrases. Focus on unique features, specific clothing details, and the overall composition. Ensure the main trigger features are universally described. Format: tag1, tag2, detailed description of outfit, pose, background elements"
  },
];
