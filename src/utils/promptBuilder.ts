import {
  CustomPromptPreset,
  KreaVariant,
  SpecTuningConfig,
  TargetModelId,
} from '../types/prompt';

export const DEFAULT_TUNING_BY_MODEL: Record<TargetModelId, SpecTuningConfig> = {
  krea2: {
    density: 'balanced',
    emphasizeMaterials: true,
    quoteTypography: true,
    includeOpticalLens: true,
    includeArtistOrMedium: true,
    purePositiveOnly: true,
    extraDirective: '',
  },
  moss_prose: {
    density: 'exhaustive',
    emphasizeMaterials: true,
    quoteTypography: true,
    includeOpticalLens: false,
    includeArtistOrMedium: true,
    purePositiveOnly: true,
    extraDirective: '',
  },
  moss_layout: {
    density: 'balanced',
    emphasizeMaterials: false,
    quoteTypography: true,
    includeOpticalLens: false,
    includeArtistOrMedium: false,
    purePositiveOnly: true,
    extraDirective: '',
  },
  flux_dit: {
    density: 'balanced',
    emphasizeMaterials: true,
    quoteTypography: true,
    includeOpticalLens: true,
    includeArtistOrMedium: true,
    purePositiveOnly: true,
    extraDirective: '',
  },
  anima: {
    density: 'balanced',
    emphasizeMaterials: false,
    quoteTypography: false,
    includeOpticalLens: false,
    includeArtistOrMedium: true,
    purePositiveOnly: true,
    extraDirective: '',
  },
  lora_hybrid: {
    density: 'balanced',
    emphasizeMaterials: true,
    quoteTypography: false,
    includeOpticalLens: false,
    includeArtistOrMedium: false,
    purePositiveOnly: true,
    extraDirective: '',
  },
  danbooru_tags: {
    density: 'exhaustive',
    emphasizeMaterials: true,
    quoteTypography: false,
    includeOpticalLens: false,
    includeArtistOrMedium: false,
    purePositiveOnly: true,
    extraDirective: '',
  },
};

export function getEffectiveTuning(
  model: TargetModelId,
  overrides?: Partial<Record<TargetModelId, SpecTuningConfig>>
): SpecTuningConfig {
  return {
    ...DEFAULT_TUNING_BY_MODEL[model],
    ...(overrides?.[model] ?? {}),
  };
}

export function buildCompiledSystemInstruction(params: {
  targetModel: TargetModelId;
  kreaVariant?: KreaVariant;
  tuning?: SpecTuningConfig;
  preset?: CustomPromptPreset;
  triggerWord?: string;
  globalCustomInstruction?: string;
}): string {
  const {
    targetModel,
    kreaVariant = 'large',
    tuning = DEFAULT_TUNING_BY_MODEL[targetModel],
    preset,
    triggerWord = '',
    globalCustomInstruction = '',
  } = params;

  const triggerNote = triggerWord.trim()
    ? `Prefix the output naturally with the trigger token "${triggerWord.trim()}".`
    : '';
  const globalNote = globalCustomInstruction.trim()
    ? `Global user rule: ${globalCustomInstruction.trim()}`
    : '';

  // If user saved a custom preset or manually overrode the full system prompt for this spec:
  if (preset && preset.promptTemplate.trim()) {
    return [preset.promptTemplate.trim(), triggerNote, globalNote]
      .filter(Boolean)
      .join('\n\n');
  }

  if (tuning.systemPromptOverride?.trim()) {
    return [tuning.systemPromptOverride.trim(), triggerNote, globalNote]
      .filter(Boolean)
      .join('\n\n');
  }

  const densityClause =
    tuning.density === 'concise'
      ? 'Keep the description tight and compact (around 40-65 words).'
      : tuning.density === 'exhaustive'
      ? 'Write an exhaustive, richly articulated description (around 110-170 words) capturing subtle background details.'
      : 'Use balanced prose density (around 65-110 words).';

  const modifiers: string[] = [];
  if (tuning.emphasizeMaterials) {
    modifiers.push(
      'Emphasize tactile surface materials (wood grain, stoneware, wool weave, brushed metal, frosted glass) and how light interacts with them.'
    );
  }
  if (tuning.quoteTypography) {
    modifiers.push(
      'If any signage, lettering, or printed words are visible, transcribe them verbatim inside double quotes ("...") and preserve line breaks with \\n for multi-line blocks.'
    );
  }
  if (tuning.includeOpticalLens) {
    modifiers.push(
      'Include subtle optical grounding when visually evident (focal framing, shallow depth of field, film grain, directional light falloff).'
    );
  }
  if (tuning.includeArtistOrMedium) {
    modifiers.push(
      targetModel === 'anima'
        ? 'Preserve or include explicit medium/style cues or @artist anchors when relevant.'
        : 'State the exact visual medium or photographic format in the opening clause.'
    );
  }
  if (tuning.purePositiveOnly) {
    modifiers.push(
      'Strictly use pure positive phrasing; forbid negative prompts, Midjourney CLI flags (--ar/--v), and empty quality spam (8k, ultra detailed, hyperrealistic).'
    );
  }
  if (tuning.extraDirective.trim()) {
    modifiers.push(`Custom tuning rule: ${tuning.extraDirective.trim()}`);
  }

  const modifierBlock = modifiers.map((m, i) => `${i + 1}. ${m}`).join('\n');

  let baseCore = '';
  switch (targetModel) {
    case 'krea2':
      baseCore = `You are compiling a prompt for the Krea 2 (${kreaVariant}) foundation model.
Output ONLY natural flowing English prose (no comma-separated keyword soup).
Structure: [Medium / Shot Type] + [Subject & Pose] + [Setting] + [Lighting & Atmosphere] + [Materials & Texture].
${kreaVariant === 'turbo' ? 'Target Krea 2 Turbo rapid ideation framing.' : kreaVariant === 'medium' ? 'Target Krea 2 Medium clean stylistic fidelity.' : 'Target Krea 2 Large raw physical texture & film stock nuance.'}`;
      break;
    case 'moss_prose':
      baseCore = `You are compiling a prompt for MOSS-Image (OpenMOSS 5B long-context encoder).
Output ONLY a spatially coherent English paragraph clearly anchoring foreground, midground, and background placement.`;
      break;
    case 'moss_layout':
      baseCore = `You are a spatial layout compiler for MOSS-Image (OpenMOSS).
Return valid JSON ONLY matching: {"scene_summary": string, "aspect_ratio": string, "elements": [{"label": string, "category": "subject"|"object"|"typography"|"environment"|"lighting", "description": string, "bbox": [ymin, xmin, ymax, xmax], "text_content"?: string}]}.
Use integer coordinates normalized 0-1000.`;
      break;
    case 'flux_dit':
      baseCore = `You are compiling a prompt for Flux.2 / Qwen-Image / modern DiT architectures.
Output ONLY direct, literal natural English prose with foreground/midground/background depth separation and accurate lighting direction.`;
      break;
    case 'anima':
      baseCore = `You are compiling a prompt for CircleStone Anima (Qwen3 text encoder).
Format: Start with "safe," followed by subject count, framing, and 10-20 lowercase SPACE-separated Danbooru visual tags (no underscores in visual tags, no ((...)) or (word:1.2) CLIP weights). End with a period followed by 1 to 3 clear natural-language English sentences describing action, spatial layout, and lighting.`;
      break;
    case 'lora_hybrid':
      baseCore = `You are compiling a Tag-Master Hybrid LoRA dataset caption.
Output TWO blocks separated by one blank line:
Block 1: Single line of 12-26 concise lowercase visual tags separated by comma and space.
Block 2: One factual natural English paragraph describing the exact visible scene.`;
      break;
    case 'danbooru_tags':
      baseCore = `You are compiling a 9-layer Tag-Master pure visual tag sequence.
Output ONLY one line of lowercase comma-separated tags ordered by: Subject -> Pose -> Features -> Attire -> Palette -> Materials -> Framing -> Environment -> Lighting. No sentences, no nested brackets.`;
      break;
  }

  return [
    baseCore,
    densityClause,
    modifierBlock,
    triggerNote,
    globalNote,
  ]
    .filter(Boolean)
    .join('\n\n');
}
