
export interface TagImage {
  id: string;
  file: File;
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
}

export const DEFAULT_PROMPT = "Describe this image in detail for an AI image generator training dataset. Focus on the subject, clothes, pose, background, lighting, and artistic style. Provide the output as comma-separated keywords.";

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'default-danbooru',
    label: "Danbooru Tags",
    value: "Analyze this image and provide a list of accurate, descriptive tags separated by commas. Include tags for character, clothing, setting, pose, and style. Do not use full sentences. Format: tag1, tag2, tag3"
  },
  {
    id: 'default-caption',
    label: "Natural Language",
    value: "Write a detailed, descriptive caption for this image. Focus on the main subject, their actions, the environment, and the visual style. Use a neutral, objective tone."
  },
  {
    id: 'default-sd',
    label: "Stable Diffusion",
    value: "Describe this image as a Stable Diffusion prompt. Start with the subject, followed by details about appearance, clothing, background, lighting, and medium/style. Use high-quality descriptors."
  }
];
