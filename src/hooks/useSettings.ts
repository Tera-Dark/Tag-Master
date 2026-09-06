import { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_PROMPT, AiProvider, PROMPT_MODE_A, PROMPT_MODE_B, PROMPT_MODE_C, PROMPT_MODE_D } from '../types';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'lora-tag-master-settings-v9';

const DEFAULT_PROVIDERS: AiProvider[] = [
  {
    id: 'google-default',
    name: 'Google Gemini (官方)',
    protocol: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: '',
    avatar: 'G',
    avatarBg: '#1e88e5',
    avatarColor: '#ffffff',
    isSystem: true,
    models: [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        capabilities: ['vision', 'text', 'audio', 'video', 'tools'],
        group: 'gemini'
      },
      {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash Lite',
        capabilities: ['vision', 'text', 'audio', 'video', 'tools'],
        group: 'gemini'
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        capabilities: ['vision', 'text', 'audio', 'video', 'tools'],
        group: 'gemini'
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        capabilities: ['vision', 'text', 'audio', 'video', 'tools', 'reasoning'],
        group: 'gemini'
      }
    ]
  },
  {
    id: 'openai-default',
    name: 'OpenAI (官方/兼容)',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    avatar: 'O',
    avatarBg: '#10a37f',
    avatarColor: '#ffffff',
    isSystem: true,
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o (Omni)',
        capabilities: ['vision', 'text', 'audio', 'tools'],
        group: 'openai'
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        capabilities: ['vision', 'text', 'tools'],
        group: 'openai'
      },
      {
        id: 'o1',
        name: 'OpenAI o1',
        capabilities: ['vision', 'text', 'reasoning', 'tools'],
        group: 'openai'
      }
    ]
  },
  {
    id: 'siliconflow-default',
    name: 'SiliconFlow (硅基流动)',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: '',
    avatar: '硅',
    avatarBg: '#6366f1',
    avatarColor: '#ffffff',
    isSystem: true,
    models: [
      {
        id: 'Qwen/Qwen2.5-VL-72B-Instruct',
        name: 'Qwen2.5-VL 72B (推荐视觉)',
        capabilities: ['vision', 'text', 'tools'],
        group: 'qwen'
      },
      {
        id: 'Qwen/Qwen2.5-VL-7B-Instruct',
        name: 'Qwen2.5-VL 7B',
        capabilities: ['vision', 'text', 'tools'],
        group: 'qwen'
      },
      {
        id: 'deepseek-ai/DeepSeek-R1',
        name: 'DeepSeek-R1 (深度推理)',
        capabilities: ['text', 'reasoning'],
        group: 'deepseek'
      }
    ]
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh',
  theme: 'dark',
  viewMode: 'grid',
  protocol: 'google',
  providerName: 'Google Gemini (官方)',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gemini-2.0-flash',
  activePrompt: DEFAULT_PROMPT,
  concurrency: 3,
  customTemplates: [],
  gridColumns: 5,
  blockedWords: ['username', 'text logo', 'watermark', 'date', 'signature'],
  replacementRules: [],
  providers: DEFAULT_PROVIDERS,
  activeProviderId: 'google-default',
  rateLimitPreset: 'unlimited',
  requestIntervalSec: 12
};

const clampColumns = (cols?: number): number => {
  if (typeof cols !== 'number' || isNaN(cols)) return 5;
  if (cols < 3) return 3;
  if (cols > 8) return 8;
  return cols;
};

// Helper to resolve active prompt and auto-upgrade legacy prompts
const resolveActivePrompt = (parsedPrompt?: string): string => {
  if (!parsedPrompt) return DEFAULT_PROMPT;
  // Auto-upgrade legacy v1, v2.0, and pre-medusa v2.1 prompts to the gold standard
  if (
    parsedPrompt.includes('Visual Prompt Compiler v2.0') ||
    (parsedPrompt.includes('Visual Prompt Compiler v2.1') && !parsedPrompt.includes('medusa')) ||
    parsedPrompt.includes('Analyze this image for a LoRA training dataset') ||
    parsedPrompt.includes('default-danbooru') ||
    parsedPrompt.includes('default-caption') ||
    parsedPrompt.includes('default-optimal')
  ) {
    if (parsedPrompt.includes('Mode A') || parsedPrompt.includes('Tag Group') || parsedPrompt.includes('Tag + Natural Language')) return PROMPT_MODE_A;
    if (parsedPrompt.includes('Mode B')) return PROMPT_MODE_B;
    if (parsedPrompt.includes('Mode C')) return PROMPT_MODE_C;
    if (parsedPrompt.includes('Mode D')) return PROMPT_MODE_D;
    return DEFAULT_PROMPT;
  }
  return parsedPrompt;
};

const ensureProviderDefaults = (providers: AiProvider[]): AiProvider[] => {
  return providers.map(p => {
    let avatarBg = p.avatarBg;
    const avatarColor = p.avatarColor || '#ffffff';
    let isSystem = p.isSystem;

    if (p.id === 'google-default') {
      avatarBg = avatarBg || '#1e88e5';
      isSystem = true;
    } else if (p.id === 'openai-default') {
      avatarBg = avatarBg || '#10a37f';
      isSystem = true;
    } else if (p.id === 'siliconflow-default') {
      avatarBg = avatarBg || '#6366f1';
      isSystem = true;
    } else if (!avatarBg) {
      avatarBg = '#18181b';
    }

    return {
      ...p,
      avatarBg,
      avatarColor,
      isSystem: Boolean(isSystem)
    };
  });
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('lora-tag-master-settings-v8');
    if (saved) {
      // 1. Try Legacy (Plain JSON)
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const mergedProviders = ensureProviderDefaults(parsed.providers?.length ? parsed.providers : DEFAULT_PROVIDERS);
          return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            activePrompt: resolveActivePrompt(parsed.activePrompt),
            gridColumns: clampColumns(parsed.gridColumns),
            providers: mergedProviders,
            activeProviderId: parsed.activeProviderId || mergedProviders[0].id
          };
        }
      } catch {
        // Not plain JSON, continue to Base64
      }

      // 2. Try New (Base64)
      try {
        const binaryString = window.atob(saved);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decoded = new TextDecoder().decode(bytes);
        const parsed = JSON.parse(decoded);
        const mergedProviders = ensureProviderDefaults(parsed.providers?.length ? parsed.providers : DEFAULT_PROVIDERS);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          activePrompt: resolveActivePrompt(parsed.activePrompt),
          gridColumns: clampColumns(parsed.gridColumns),
          providers: mergedProviders,
          activeProviderId: parsed.activeProviderId || mergedProviders[0].id
        };
      } catch (e) {
        console.warn('Failed to load settings (corruption or format mismatch)', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Persist settings (Obfuscated)
  useEffect(() => {
    try {
      const json = JSON.stringify(settings);
      const bytes = new TextEncoder().encode(json);
      const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
      const encoded = window.btoa(binaryString);

      localStorage.setItem(STORAGE_KEY, encoded);
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const { t, i18n } = useTranslation();

  // Sync language state to i18n
  useEffect(() => {
    if (settings.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);

  return { settings, setSettings, t };
};