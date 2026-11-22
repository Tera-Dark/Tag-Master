import { LEGACY_BUZZWORDS } from '../data/modelSpecs';
import { MossLayoutSpec, ReplacementRule, TargetModelId } from '../types/prompt';

export function detectLegacyBuzzwords(text: string, targetModel: TargetModelId): string[] {
  if (!text.trim()) return [];
  const found = new Set<string>();
  const lower = text.toLowerCase();

  // Anima Base permits quality/score openers like masterpiece, best quality, score_7,
  // whereas Krea 2, MOSS, Flux, and pure LoRA dataset modes prohibit them.
  const buzzwordList =
    targetModel === 'anima'
      ? LEGACY_BUZZWORDS.filter(
          (t) =>
            ![
              'masterpiece',
              'best quality',
              'high quality',
              'score_9',
              'score_8_up',
              'score_7_up',
            ].includes(t)
        )
      : LEGACY_BUZZWORDS;

  for (const term of buzzwordList) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[\\s,.;:()])${escaped}($|[\\s,.;:()])`, 'i');
    if (regex.test(lower)) {
      found.add(term);
    }
  }

  // Detect Midjourney CLI parameters in non-MJ models
  const cliFlags = text.match(/--(?:ar|v|stylize|chaos|weird|no|seed|iw|tile)\b(?:\s+[^\s,]+)?/gi);
  if (cliFlags) {
    cliFlags.forEach((f) => found.add(f.trim()));
  }

  // Detect nested weights ((...)) or (word:1.2)
  if (/\(\([^)]+\)\)|\{[^}]+\}|\[[^\]]+\]|:[0-9]+\.[0-9]+\)/.test(text)) {
    found.add('((weighted brackets))');
  }

  // For Anima, flag underscore-joined visual tags (e.g. long_hair) except score_* or @artist_*
  if (targetModel === 'anima') {
    const underscoreMatches = text.match(/\b(?!(?:score_\d+|@))([a-z]+_[a-z_]+)\b/g);
    if (underscoreMatches && underscoreMatches.length > 0) {
      found.add('underscore_tags');
    }
  }

  // If targeting prose models (krea2, moss_prose, flux_dit), flag if there is no sentence punctuation and > 8 commas
  if (
    (targetModel === 'krea2' || targetModel === 'moss_prose' || targetModel === 'flux_dit') &&
    (text.match(/,/g) || []).length >= 8 &&
    !/[.。]/.test(text)
  ) {
    found.add('comma-tag-soup');
  }

  return Array.from(found);
}

export function cleanLegacyBuzzwords(
  text: string,
  blockedWords: string[] = [],
  rules: ReplacementRule[] = [],
  targetModel?: TargetModelId
): string {
  if (!text.trim()) return text;
  let result = text;

  // Strip CLI flags like --ar 16:9 --v 6.1
  result = result.replace(/--(?:ar|v|stylize|chaos|weird|no|seed|iw|tile)\b(?:\s+[^\s,]+)?/gi, '');

  // Unwrap ((...)) or {{...}} or (word:1.2)
  result = result.replace(/\(\(([^)]+)\)\)/g, '$1');
  result = result.replace(/\{\{([^}]+)\}\}/g, '$1');
  result = result.replace(/\(([^():]+):[0-9.]+\)/g, '$1');

  // For Anima, convert underscore visual tags to spaces (keeping score_N and @artist_name intact)
  if (targetModel === 'anima') {
    result = result.replace(/\b(?!score_\d+\b)([a-z]+)_([a-z_]+)\b/g, (_m, a, b) =>
      `${a} ${b.replace(/_/g, ' ')}`
    );
  }

  const removeList =
    targetModel === 'anima'
      ? LEGACY_BUZZWORDS.filter(
          (t) => !['masterpiece', 'best quality', 'high quality'].includes(t)
        )
      : LEGACY_BUZZWORDS;

  const allRemove = [...removeList, ...blockedWords.map((w) => w.trim()).filter(Boolean)];
  for (const term of allRemove) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|,\\s*|\\s+)${escaped}(?=\\s*,|\\s*\\.|$|\\s+)`, 'gi');
    result = result.replace(regex, '');
  }

  for (const rule of rules) {
    if (rule.pattern) {
      result = result.split(rule.pattern).join(rule.replace);
    }
  }

  // Normalize stray punctuation
  return result
    .replace(/,\s*,+/g, ',')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function parseMossLayoutJson(caption: string): MossLayoutSpec | undefined {
  if (!caption.trim().startsWith('{')) return undefined;
  try {
    const parsed = JSON.parse(caption);
    if (parsed && Array.isArray(parsed.layout)) {
      return parsed as MossLayoutSpec;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function getPromptMetrics(caption: string): {
  words: number;
  chars: number;
  approxTokens: number;
} {
  const trimmed = caption.trim();
  if (!trimmed) return { words: 0, chars: 0, approxTokens: 0 };
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const chars = trimmed.length;
  const approxTokens = Math.max(1, Math.round(chars / 4));
  return { words, chars, approxTokens };
}
