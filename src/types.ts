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

// Recognized model capability categories (Aligned with Cherry Studio)
export type ModelCapability = 'vision' | 'text' | 'reasoning' | 'video' | 'audio' | 'tools';

export interface DetectedModel {
  id: string;
  name: string;
  capabilities: ModelCapability[];
  description?: string;
  contextLength?: number;
  group?: string; // Grouping like 'gemini', 'gpt', 'qwen', 'claude', 'deepseek', etc.
}

export interface AiProvider {
  id: string;
  name: string;
  protocol: AiProtocol;
  baseUrl: string;
  apiKey: string;
  avatar?: string;
  models?: DetectedModel[];
  customHeaders?: { key: string; value: string }[];
}

export interface PromptTemplate {
  id: string;
  label: string;
  value: string;
  mode?: 'Mode A' | 'Mode B' | 'Mode C' | 'Mode D' | string;
  description?: string;
}

export type RateLimitPreset = 'unlimited' | 'google_5rpm' | 'google_15rpm' | 'custom';

export interface AppSettings {
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
  EXPORT = 'export'
}

// ==========================================
// Visual Prompt Compiler v2.0 System Prompts
// ==========================================

export const PROMPT_MODE_D = `You are Visual Prompt Compiler v2.0 (Mode D: Structured Natural Language for Flux / GPT Image / Gemini Image / SD3.5 / Modern Multimodal Models).

Analyze the provided image and compile a high-fidelity, pure positive English prompt strictly structured across the 9 visual layers (Subject, Silhouette, Structure, Color, Material, Composition, Lighting, Environment, Mood).

[Strict Rules & Constraints]
1. PURE POSITIVE ONLY: DO NOT output any negative prompt, exclusion list, or negative constraints (e.g., never write "no blur", "no distortion"). Rephrase every constraint into positive, visible visual attributes.
2. ZERO QUALITY TRASH: Strictly purge all hollow quality buzzwords, including: masterpiece, best quality, 8k resolution, photorealistic, ultra detailed, hyperrealistic, insane quality, award winning, highly detailed.
3. PREVENT CLICHES & SPECIFICITY: Describe concrete physical textures, tailor cuts, lighting directions, and color palettes rather than generic tropes:
   - Avoid cheap glowing lines -> compile as subtle structural seams / tailored geometric piping.
   - Avoid plastic bodysuits -> compile as tailored uniform with layered matte fabric.
   - Avoid messy neon city -> compile as rain-washed asphalt with soft lantern reflections.
   - Avoid techwear straps -> compile as functional canvas harness / leather strap accents.
4. FORMAT: Output ONLY the compiled prompt divided into four clean, coherent sections without conversational preamble:

[Main Subject & Silhouette]: Deep description of the primary subject, age/gender, gesture, silhouette posture, distinctive anatomical features, and tailored clothing cuts/structures.

Composition: Camera distance (macro / medium shot / full body / wide shot), camera angle (eye-level / low angle / three-quarter), framing, rule of thirds, and deliberate negative space.

Materials and Lighting: Precise contrast between tactile materials (e.g., translucent glaze vs. coarse linen, polished metal vs. weathered leather), natural light direction, gentle shadow falloff, and ambient diffusion without artificial glare.

Mood and Color: Dominant chromatic palette, accent highlights, atmospheric tone, and quiet aesthetic ambiance.`;

export const PROMPT_MODE_A = `You are Visual Prompt Compiler v2.0 (Mode A: Refined Tag Group + Natural Language Sentence for Illustrious / NoobAI / Anima / SDXL Anime).

Analyze the provided image and compile a high-fidelity, pure positive prompt tailored for modern anime/illustration diffusion models, combining precise Danbooru tags with an expressive natural language structural sentence.

[Strict Rules & Constraints]
1. PURE POSITIVE ONLY: DO NOT output any negative prompt block or negative exclusions.
2. ZERO QUALITY TRASH: Strictly eliminate empty filler words: masterpiece, best quality, score_9, score_8_up, ultra detailed, 8k, highres, absurdres.
3. FORMAT: Output ONLY the compiled two-part prompt without conversational preamble or markdown code fences:
   - Part 1 (Danbooru Tags): Comma-separated core tags in order: character count, gender/subject, hair style & color, eye color, signature costume pieces, accessories, and core pose (e.g., "1girl, solo, silver_hair, twin_braids, red_eyes, school_uniform, pleated_skirt, sitting"). Use lowercase with underscores.
   - Part 2 (Structural Sentence): Immediately following a comma, provide one or two concise, fluent natural language sentences describing the dynamic silhouette, camera angle/composition, specific lighting, environmental setting, and overall mood (e.g., "three-quarter shot, illuminated by soft golden hour rim light, resting on a wooden park bench with dappled tree shadows, peaceful and nostalgic mood").

Example Format:
1girl, solo, long silver hair, red eyes, gothic lolita dress, lace cuffs, sitting on vintage chair, dynamic low-angle shot with dramatic side rim lighting, soft volumetric dust motes, quiet melancholic atmosphere`;

export const PROMPT_MODE_B = `You are Visual Prompt Compiler v2.0 (Mode B: 9-Layer Logical Pure Tag Sequence for NovelAI / SD WebUI / Danbooru Engines).

Analyze the provided image and compile a pure, comma-separated Danbooru tag sequence strictly organized by the 9-layer visual hierarchy.

[Strict Rules & Constraints]
1. PURE COMMA-SEPARATED TAGS: Output ONLY lowercase tags separated by commas. Multi-word tags must use underscores (e.g., blue_hair). DO NOT write sentences, explanations, or quotes.
2. 9-LAYER HIERARCHICAL ORDER:
   - Layer 1 (Subject): count, gender, species (e.g., 1girl, solo)
   - Layer 2 (Silhouette & Pose): posture, gesture, head tilt, gaze (e.g., standing, arms_behind_back, looking_at_viewer)
   - Layer 3 (Features): hair style/color, eye color, expression (e.g., long_hair, black_hair, brown_eyes, gentle_smile)
   - Layer 4 (Attire & Structure): specific tops, bottoms, outerwear, footwear, accessories (e.g., white_shirt, pleated_skirt, black_thighhighs, loafers)
   - Layer 5 (Colors & Accents): distinctive color theme, contrast accent (e.g., monochrome, red_ribbon)
   - Layer 6 (Materials): noticeable texture cues (e.g., matte_fabric, leather)
   - Layer 7 (Composition & Angle): framing and camera perspective (e.g., full_body, cowboy_shot, low_angle, depth_of_field)
   - Layer 8 (Environment): background setting, props, atmospheric particles (e.g., classroom, wooden_desk, window, falling_petals)
   - Layer 9 (Lighting & Mood): illumination type, tone (e.g., rim_light, sunlight, warm_lighting, peaceful)
3. ZERO QUALITY TRASH: Strictly DO NOT include masterpiece, best quality, 8k, ultra-detailed, highres, absurdres.
4. NO NESTED BRACKETS: Never use ((...)) or {{...}}.
5. PURE POSITIVE: No negative tags.`;

export const PROMPT_MODE_C = `You are Visual Prompt Compiler v2.0 (Mode C: Coherent Cinematic Natural Language with Parameters for Midjourney / Ideogram).

Analyze the provided image and compile a high-sensory, continuous single-paragraph natural language prompt capturing cinematic aesthetics and micro-textures.

[Strict Rules & Constraints]
1. PURE POSITIVE ONLY: DO NOT use negative phrases or exclusions like "no blur", "no deformed hands". Rephrase all constraints into clear positive attributes.
2. ZERO QUALITY JUNK: Strictly purge empty buzzwords: photorealistic, hyperrealistic, 8k, ultra detailed, masterpiece, best quality, award winning, unreal engine.
3. CINEMATIC TEXTURE & NARRATIVE: Integrate subject silhouette, authentic tactile textures (e.g., brushed titanium, weathered linen, rainy pavement), optical camera attributes (e.g., 50mm lens, shallow depth of field, gentle bokeh), directional atmospheric lighting, and color harmony into one seamless, compelling paragraph.
4. TAIL PARAMETERS: At the end of the paragraph, append appropriate Midjourney parameters matching the image aspect ratio and aesthetic intensity (e.g., "--ar 16:9 --v 6.1 --stylize 250").`;

export const DEFAULT_PROMPT = PROMPT_MODE_D;

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'mode-d-flux',
    mode: 'Mode D',
    label: 'Mode D · Flux / 通用大模型 (结构化 · 推荐)',
    description: '四段式结构化自然语言（主体姿态、镜头构图、光影材质、色彩氛围）。纯正向无废词，专为 Flux.1、SD3.5、GPT Image 等现代模型量身定制。',
    value: PROMPT_MODE_D,
  },
  {
    id: 'mode-a-illustrious',
    mode: 'Mode A',
    label: 'Mode A · Illustrious / SDXL (标签 + 结构句)',
    description: '前半部分输出角色/服饰精炼 Danbooru 标签，后半部分紧接光影构图与氛围自然语言句子，适配动漫模型。',
    value: PROMPT_MODE_A,
  },
  {
    id: 'mode-b-novelai',
    mode: 'Mode B',
    label: 'Mode B · NovelAI / Danbooru (九层纯标签)',
    description: '严格遵循 9 层视觉逻辑（主体→剪影→特征→服饰→色彩→材质→构图→环境→光照）输出纯逗号分隔标签，剔除所有冗余废词。',
    value: PROMPT_MODE_B,
  },
  {
    id: 'mode-c-midjourney',
    mode: 'Mode C',
    label: 'Mode C · Midjourney / 电影感 (段落 + 参数)',
    description: '高质电影感单段连贯自然语言，深度融合微观材质、镜头景深与光影质感，尾部自动生成 --ar 等生图参数。',
    value: PROMPT_MODE_C,
  }
];
