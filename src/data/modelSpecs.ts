import { DatasetItem, KreaVariant, Project, TargetModelId } from '../types/prompt';

export interface ModelBlueprint {
  id: TargetModelId;
  nameZh: string;
  nameEn: string;
  badgeText: string;
  summaryZh: string;
  summaryEn: string;
  syntaxStyleZh: string;
  syntaxStyleEn: string;
  antiPatterns: string[];
  formula: string;
  supportsBbox?: boolean;
  supportsVariants?: boolean;
}

export const MODEL_BLUEPRINTS: Record<TargetModelId, ModelBlueprint> = {
  krea2: {
    id: 'krea2',
    nameZh: 'Krea 2 自然散文',
    nameEn: 'Krea 2 Prose',
    badgeText: 'Krea 2',
    summaryZh: '摒弃关键词堆砌，开篇锚定媒介，聚焦材质光影与双引号原生文本。',
    summaryEn: 'Pure natural prose opening with medium, tactile materials, surface light, and quoted text.',
    syntaxStyleZh: '自然长句 · 无负面词 · 双引号文字',
    syntaxStyleEn: 'Flowing prose · Pure positive · Quoted text',
    antiPatterns: ['masterpiece', '8k', 'best quality', 'photorealistic', '--no'],
    formula: '[Medium / Shot] + [Subject & Pose] + [Setting] + [Lighting] + [Material & Texture]',
    supportsVariants: true,
  },
  moss_prose: {
    id: 'moss_prose',
    nameZh: 'MOSS-Image 长语境',
    nameEn: 'MOSS-Image Prose',
    badgeText: 'MOSS 5B',
    summaryZh: '适配 OpenMOSS 4K 长上下文编码器，强化空间层次与 \\n 多行排版引用。',
    summaryEn: 'Long-context spatial narrative built for OpenMOSS with explicit \\n multi-line typography.',
    syntaxStyleZh: '空间叙事 · \\n 换行引号 · Euler 50步',
    syntaxStyleEn: 'Spatial prose · Quoted \\n breaks · Euler 50',
    antiPatterns: ['score_9', 'absurdres', 'highres', '((...))'],
    formula: '[Spatial Anchor] + [Subject & Props] + [Quoted "\\n" Text] + [Atmosphere]',
  },
  moss_layout: {
    id: 'moss_layout',
    nameZh: 'MOSS 原生空间 JSON',
    nameEn: 'MOSS Layout JSON',
    badgeText: 'MOSS JSON',
    summaryZh: '输出结构化 JSON 布局提示词，含归一化 [ymin, xmin, ymax, xmax] 坐标框与文字区域。',
    summaryEn: 'Structured native layout JSON with [ymin, xmin, ymax, xmax] bounding boxes and text blocks.',
    syntaxStyleZh: '结构化 JSON · BBox 坐标框 · 精准构图',
    syntaxStyleEn: 'Layout JSON · BBox coordinates · Exact placement',
    antiPatterns: ['tag soup', 'unstructured weights'],
    formula: '{ prompt, aspect_ratio, layout: [{ label, category, bbox }], sampler_hint }',
    supportsBbox: true,
  },
  flux_dit: {
    id: 'flux_dit',
    nameZh: 'Flux / DiT 光学写实',
    nameEn: 'Flux / DiT Optical',
    badgeText: 'Flux DiT',
    summaryZh: '针对 Flux.2、Qwen-Image 与 Gemini Image 的物理镜头与景深分层描述。',
    summaryEn: 'Camera-grounded spatial narrative for Flux.2, Qwen-Image, and modern DiT engines.',
    syntaxStyleZh: '镜头焦段 · 前中后景 · 零质量废词',
    syntaxStyleEn: 'Optical physics · Depth planes · Zero fluff',
    antiPatterns: ['8k', 'hyperrealistic', 'unreal engine', '--v 6'],
    formula: '[Lens & Framing] + [Foreground / Midground / Background] + [Light Path]',
  },
  anima: {
    id: 'anima',
    nameZh: 'Anima 动漫混编 (Qwen3)',
    nameEn: 'Anima Hybrid (Qwen3)',
    badgeText: 'Anima',
    summaryZh: '适配 CircleStone Anima：空格分隔 Danbooru 标签 + @画师锚点 + 1–3 句自然语言光影与动作叙事。',
    summaryEn: 'Tailored for Anima Qwen3 encoder: space-separated Danbooru tags, @artist anchors, and 1–3 trailing prose sentences.',
    syntaxStyleZh: '空格标签 + @画师 + 自然句尾 · CFG 4–5',
    syntaxStyleEn: 'Spaced tags + @artist + prose tail · CFG 4–5',
    antiPatterns: ['((...))', '(tag:1.3)', 'underscore_tags', '--ar'],
    formula: 'safe, [count], [@artist], [spaced visual tags]. [1-3 sentences on pose, scene & lighting.]',
  },
  lora_hybrid: {
    id: 'lora_hybrid',
    nameZh: 'LoRA 双轨混合',
    nameEn: 'LoRA Hybrid',
    badgeText: 'Hybrid',
    summaryZh: '保留 Tag-Master 经典双段式规范：首行精细视觉标签 + 空行后客观自然段落。',
    summaryEn: 'Classic Tag-Master dual-block standard: concise visual tags followed by factual prose.',
    syntaxStyleZh: '标签行 + 段落 · 触发词友好',
    syntaxStyleEn: 'Tags + Paragraph · Trigger-ready',
    antiPatterns: ['score_9', 'masterpiece', 'best quality'],
    formula: '[comma-separated tags]\\n\\n[factual natural language paragraph]',
  },
  danbooru_tags: {
    id: 'danbooru_tags',
    nameZh: '9 层纯净标签序列',
    nameEn: '9-Layer Visual Tags',
    badgeText: 'Tags',
    summaryZh: '经典 9 层视觉结构纯逗号标签序列，适合 Illustrious、Animagine 与传统训练集。',
    summaryEn: 'Ordered 9-layer comma-separated tag sequence for Illustrious and tag-based trainers.',
    syntaxStyleZh: '9 层秩序 · 纯正向 · 零嵌套权重',
    syntaxStyleEn: '9-layer order · Pure positive · No brackets',
    antiPatterns: ['((...))', 'masterpiece', '8k', 'worst quality'],
    formula: 'subject, pose, features, attire, palette, material, framing, setting, lighting',
  },
};

export const KREA_VARIANT_LABELS: Record<KreaVariant, { zh: string; en: string; descZh: string; descEn: string }> = {
  turbo: {
    zh: 'Turbo 构思',
    en: 'Turbo',
    descZh: '45–65 词紧凑描述，适合快速构图迭代',
    descEn: 'Compact 45–65 words for rapid ideation',
  },
  medium: {
    zh: 'Medium 均衡',
    en: 'Medium',
    descZh: '60–95 词稳定描述，兼顾插画与风格还原',
    descEn: 'Balanced 60–95 words for illustration & clean style',
  },
  large: {
    zh: 'Large 质感',
    en: 'Large',
    descZh: '80–130 词深度质感，突出胶片颗粒与表面光影',
    descEn: 'Rich 80–130 words for photorealism & surface grain',
  },
};

export const LEGACY_BUZZWORDS = [
  'masterpiece',
  'best quality',
  'high quality',
  'ultra detailed',
  'ultra-detailed',
  'extremely detailed',
  'photorealistic',
  'hyperrealistic',
  '8k',
  '4k',
  'uhd',
  'hdr',
  'absurdres',
  'highres',
  'score_9',
  'score_8_up',
  'score_7_up',
  'award winning',
  'trending on artstation',
  'unreal engine',
  'octane render',
  'ray tracing',
  'worst quality',
  'low quality',
  'bad anatomy',
];

export const LEGACY_PROMPT_EXAMPLES: {
  id: string;
  titleZh: string;
  titleEn: string;
  source: string;
  aspectRatio: string;
}[] = [
  {
    id: 'sdxl-portrait',
    titleZh: '传统 SDXL 堆砌词条 → Krea 2',
    titleEn: 'Legacy SDXL Tag Soup → Krea 2',
    source:
      '1girl, solo, messy brown hair, oversized charcoal wool coat, standing by window, concrete wall, overcast lighting, candid, ((photorealistic)), 8k uhd, masterpiece, best quality, ultra detailed, bokeh, --ar 3:4 --v 6.1',
    aspectRatio: '3:4',
  },
  {
    id: 'moss-cafe-idea',
    titleZh: '中文分镜灵感 → MOSS 空间 JSON',
    titleEn: 'Scene Idea → MOSS Layout JSON',
    source:
      '雨后黄昏的石板路巷口，一家叫 KISSA LAB 的独立咖啡馆。上方悬挂原木招牌写着 KISSA LAB，门楣小牌写着 ARTISAN COFFEE & SOUNDS，落地玻璃透出暖黄色吊灯和室内吧台，门口放着一块手写黑板。',
    aspectRatio: '4:3',
  },
  {
    id: 'product-material',
    titleZh: '电商关键词 → Flux / Krea 质感散文',
    titleEn: 'Product Keywords → Tactile Prose',
    source:
      'silver rangefinder camera, black leather grip, sitting on stone, studio light, sharp focus, 8k, octane render, commercial product shot, minimalist, no blur, no watermark',
    aspectRatio: '1:1',
  },
  {
    id: 'anima-illustration',
    titleZh: '旧版二次元权重 → Anima 混编',
    titleEn: 'Weighted Anime Tags → Anima Hybrid',
    source:
      '((masterpiece)), (best quality:1.2), 1girl, solo, silver_hair, red_eyes, white_hanfu, wide_sleeves, holding_lantern, night_sky, ((cherry_blossoms)), standing under moon, volumetric_lighting',
    aspectRatio: '3:4',
  },
];

const SAMPLE_MOSS_LAYOUT_CAFE = {
  model: 'moss-image' as const,
  aspect_ratio: '4:3',
  prompt:
    'An atmospheric dusk street photograph of an independent coffee bar storefront on a rain-slicked cobblestone alley. Above the dark timber entrance, a rectangular pale wood hanging sign clearly reads "KISSA LAB" in crisp dark serif lettering, with a smaller transom plaque below reading "ARTISAN COFFEE & SOUNDS". Warm amber pendant bulbs glow through tall glass panes revealing patrons around a wooden counter, while a damp sidewalk chalkboard stands beside potted ferns on wet stone reflecting golden light.',
  layout: [
    {
      id: 'el_1',
      label: 'Hanging Wooden Sign',
      category: 'typography',
      description: 'Rectangular light-oak hanging sign above storefront entrance',
      bbox: [125, 448, 322, 675] as [number, number, number, number],
      text_content: 'KISSA LAB',
    },
    {
      id: 'el_2',
      label: 'Transom Plaque',
      category: 'typography',
      description: 'Narrow wooden plaque centered above the glass door',
      bbox: [322, 540, 360, 650] as [number, number, number, number],
      text_content: 'ARTISAN COFFEE & SOUNDS',
    },
    {
      id: 'el_3',
      label: 'Warm Glass Storefront',
      category: 'environment',
      description: 'Illuminated cafe interior visible through dark-framed windows with pendant bulbs',
      bbox: [290, 455, 760, 762] as [number, number, number, number],
    },
    {
      id: 'el_4',
      label: 'Sidewalk Chalkboard',
      category: 'object',
      description: 'Wooden A-frame menu board resting near the entrance',
      bbox: [652, 348, 828, 435] as [number, number, number, number],
      text_content: 'KISSA LAB',
    },
    {
      id: 'el_5',
      label: 'Wet Cobblestone Reflections',
      category: 'lighting',
      description: 'Rain-dampened stone pavement catching amber reflections in the foreground',
      bbox: [730, 0, 1000, 1000] as [number, number, number, number],
    },
  ],
  sampler_hint: {
    sampler: 'Flow-Matching Euler',
    steps: 50,
    cfg_scale: 3.5,
    shift: 5.0,
  },
};

export function createSampleProjects(): Project[] {
  const now = Date.now();
  const sampleItems: DatasetItem[] = [
    {
      id: 'sample-ceramic',
      name: 'ceramic_still_life.jpg',
      previewUrl: '/src/assets/images/sample_ceramic_studio_1795343458020.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 900,
      status: 'success',
      targetModel: 'krea2',
      kreaVariant: 'large',
      caption:
        'An editorial still-life photograph of a speckled matte stoneware vase holding dried oat stalks beside a neatly folded coarse ivory linen cloth on a weathered oak studio table. Soft directional morning window light grazes the textured plaster wall behind, casting gentle diffused shadows across the ceramic glaze and wood grain with subtle 35mm film grain.',
      updatedAt: now - 300000,
      isSample: true,
    },
    {
      id: 'sample-cafe',
      name: 'kissa_lab_storefront.jpg',
      previewUrl: '/src/assets/images/sample_cafe_typography_1795343457012.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 900,
      status: 'success',
      targetModel: 'moss_layout',
      caption: JSON.stringify(SAMPLE_MOSS_LAYOUT_CAFE, null, 2),
      layoutSpec: SAMPLE_MOSS_LAYOUT_CAFE,
      updatedAt: now - 200000,
      isSample: true,
    },
    {
      id: 'sample-portrait',
      name: 'gallery_window_portrait.jpg',
      previewUrl: '/src/assets/images/sample_editorial_portrait_1795343457599.jpg',
      mimeType: 'image/jpeg',
      width: 900,
      height: 1200,
      status: 'idle',
      targetModel: 'krea2',
      kreaVariant: 'large',
      caption: '',
      updatedAt: now - 100000,
      isSample: true,
    },
    {
      id: 'sample-camera',
      name: 'rangefinder_limestone.jpg',
      previewUrl: '/src/assets/images/sample_industrial_camera_1795343456483.jpg',
      mimeType: 'image/jpeg',
      width: 1024,
      height: 1024,
      status: 'idle',
      targetModel: 'moss_prose',
      caption: '',
      updatedAt: now,
      isSample: true,
    },
  ];

  return [
    {
      id: 'proj-editorial',
      name: 'Editorial & Space',
      triggerWord: '',
      targetModel: 'krea2',
      items: sampleItems,
      createdAt: now - 500000,
    },
  ];
}
