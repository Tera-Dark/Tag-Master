import { AiProvider, AppSettings, DEFAULT_PROMPT, DEFAULT_TEMPLATES } from '../../types';
import { activeConnection } from './connection';
import { CATALOG_VERSION, DEFAULT_PROVIDERS } from './catalog';
import legacyPrompts from './legacyPrompts.json';

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh',
  theme: 'light',
  viewMode: 'grid',
  protocol: 'google',
  providerName: 'Google Gemini',
  apiKey: '',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  model: 'gemini-3.8-flash',
  activePrompt: DEFAULT_PROMPT,
  captionFormat: 'tags',
  promptPresetId: 'dataset-tags-v3',
  configVersion: CATALOG_VERSION,
  concurrency: 3,
  customTemplates: [],
  gridColumns: 5,
  blockedWords: [],
  replacementRules: [],
  providers: DEFAULT_PROVIDERS,
  activeProviderId: 'google-default',
  rateLimitPreset: 'unlimited',
  requestIntervalSec: 12,
};

/** Exact stock prompts only; even a one-character user edit is preserved. */
export function migratePrompt(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_PROMPT;
  if (value === legacyPrompts.PROMPT_MODE_A || value === legacyPrompts.PROMPT_MODE_B)
    return DEFAULT_PROMPT;
  if (value === legacyPrompts.PROMPT_MODE_D) return DEFAULT_TEMPLATES[1].value;
  // Midjourney-oriented legacy Mode C has different intent. Preserve it verbatim as custom.
  return value;
}

export function migrateSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return structuredClone(DEFAULT_SETTINGS);
  const saved = raw as Partial<AppSettings>;
  const merged = { ...structuredClone(DEFAULT_SETTINGS), ...saved };
  const hadProviders = Array.isArray(saved.providers);
  let providers: AiProvider[] = hadProviders
    ? saved.providers!.filter(
        (p) => p && typeof p.id === 'string' && typeof p.protocol === 'string'
      )
    : [];
  if (!hadProviders && (saved.apiKey || saved.baseUrl || saved.model)) {
    providers = [
      {
        id: 'legacy-import',
        name: saved.providerName || '已导入服务商',
        protocol: saved.protocol || 'google',
        apiKey: saved.apiKey || '',
        baseUrl:
          saved.protocol === 'google' && saved.baseUrl === 'https://api.openai.com/v1'
            ? DEFAULT_SETTINGS.baseUrl
            : saved.baseUrl || DEFAULT_SETTINGS.baseUrl,
        customHeaders: saved.customHeaders,
        selectedModelId: saved.model || merged.model,
        models: [],
        authMode: saved.authMode,
        endpointMode: saved.endpointMode,
        modelsUrl: saved.modelsUrl,
        requestBody: saved.requestBody,
        requestBodyJson: saved.requestBodyJson,
        requestTimeoutSec: saved.requestTimeoutSec,
        maxOutputTokens: saved.maxOutputTokens,
      },
    ];
    merged.activeProviderId = 'legacy-import';
  }
  if (!providers.length && !hadProviders) providers = structuredClone(DEFAULT_PROVIDERS);
  providers = providers.map((p) => {
    const active = p.id === merged.activeProviderId;
    // Existing selected models and custom catalogs are retained; the newest presets are additive.
    const baseline = DEFAULT_PROVIDERS.find((d) => d.id === p.id);
    let models = Array.isArray(p.models)
      ? p.models
          .filter((m) => m && typeof m.id === 'string')
          .map((m) => ({ ...m, capabilities: Array.isArray(m.capabilities) ? m.capabilities : [] }))
      : [];
    let selected = p.selectedModelId ?? (active ? merged.model : (models[0]?.id ?? ''));
    let official = false;
    try {
      official = !!baseline && new URL(p.baseUrl).origin === new URL(baseline.baseUrl).origin;
    } catch {
      /* Preserve incomplete custom drafts. */
    }
    if (baseline && official && (p.catalogVersion || 0) < CATALOG_VERSION) {
      const oldDefault =
        p.id === 'google-default' &&
        /^gemini-(?:1\.5-(?:flash|pro)|2\.0-flash(?:-lite)?)$/.test(selected);
      // Only untouched bundled Google defaults advance automatically; all old IDs remain available.
      if (
        oldDefault &&
        !models.find((m) => m.id === selected && (m.source === 'manual' || m.visionMode))
      )
        selected = baseline.selectedModelId || selected;
      models = [
        ...baseline.models!.filter((m) => !models.some((old) => old.id === m.id)),
        ...models,
      ];
    }
    if (selected && !models.some((m) => m.id === selected))
      models.push({ id: selected, name: selected, capabilities: [], source: 'manual' });
    return {
      ...p,
      apiKey: typeof p.apiKey === 'string' ? p.apiKey : '',
      baseUrl: typeof p.baseUrl === 'string' ? p.baseUrl : '',
      models,
      selectedModelId: selected,
      catalogVersion: CATALOG_VERSION,
    };
  });
  const activePrompt = migratePrompt(saved.activePrompt);
  const template = DEFAULT_TEMPLATES.find((t) => t.value === activePrompt);
  return activeConnection({
    ...merged,
    providers,
    configVersion: CATALOG_VERSION,
    activePrompt,
    captionFormat: template?.format || saved.captionFormat || 'custom',
    promptPresetId: template?.id || saved.promptPresetId,
    customTemplates: Array.isArray(saved.customTemplates) ? saved.customTemplates : [],
    gridColumns:
      typeof saved.gridColumns === 'number' && Number.isFinite(saved.gridColumns)
        ? Math.min(8, Math.max(3, saved.gridColumns))
        : 5,
    activeProviderId: providers.some((p) => p.id === merged.activeProviderId)
      ? merged.activeProviderId
      : saved.activeProviderId === '' || !providers.length
        ? ''
        : providers[0].id,
  });
}
