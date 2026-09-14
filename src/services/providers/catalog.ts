import { AiProvider, DetectedModel } from '../../types';
import { detectModelCapabilities, getModelGroup } from '../modelDetector';
export const CATALOG_VERSION = 20260914;
export function presetModel(id: string, name = id): DetectedModel {
  return {
    id,
    name,
    capabilities: detectModelCapabilities(id),
    group: getModelGroup(id),
    source: 'preset',
    capabilitySource: 'inferred',
    enabled: true,
  };
}
export interface ProviderPreset {
  id: string;
  label: string;
  description: string;
  provider: Omit<AiProvider, 'id'>;
}
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'google',
    label: 'Google Gemini',
    description: '官方原生接口 · 推荐起点',
    provider: {
      name: 'Google Gemini',
      protocol: 'google',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: '',
      avatar: 'G',
      selectedModelId: 'gemini-3.8-flash',
      models: [presetModel('gemini-3.8-flash', 'Gemini 3.8 Flash')],
    },
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: '官方 Responses · 图片输入',
    provider: {
      name: 'OpenAI',
      protocol: 'openai_responses',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      avatar: 'O',
      selectedModelId: 'gpt-5.6-terra',
      models: [
        presetModel('gpt-5.6-terra', 'GPT-5.6 Terra'),
        presetModel('gpt-5.4-mini', 'GPT-5.4 mini'),
      ],
    },
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude 原生 Messages',
    provider: {
      name: 'Anthropic',
      protocol: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: '',
      avatar: 'A',
      selectedModelId: 'claude-sonnet-5',
      models: [presetModel('claude-sonnet-5', 'Claude Sonnet 5')],
    },
  },
  {
    id: 'compatible',
    label: 'OpenAI 兼容',
    description: '中转 / 自建网关 · 自定义地址',
    provider: {
      name: '自定义服务商',
      protocol: 'openai_compatible',
      baseUrl: '',
      apiKey: '',
      avatar: 'C',
      models: [],
      selectedModelId: '',
    },
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: '多模型平台 · 获取账号可用列表',
    provider: {
      name: 'OpenRouter',
      protocol: 'openai_compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: '',
      avatar: 'R',
      models: [],
      selectedModelId: '',
    },
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow',
    description: '硅基流动 · 从平台获取模型',
    provider: {
      name: 'SiliconFlow',
      protocol: 'openai_compatible',
      baseUrl: 'https://api.siliconflow.cn/v1',
      apiKey: '',
      avatar: 'S',
      models: [],
      selectedModelId: '',
    },
  },
  {
    id: 'ollama',
    label: 'Ollama',
    description: '本地 · OpenAI 兼容 · 无需密钥',
    provider: {
      name: 'Ollama',
      protocol: 'openai_compatible',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: '',
      authMode: 'none',
      avatar: 'L',
      models: [],
      selectedModelId: '',
    },
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    description: '本地 · OpenAI 兼容 · 无需密钥',
    provider: {
      name: 'LM Studio',
      protocol: 'openai_compatible',
      baseUrl: 'http://localhost:1234/v1',
      apiKey: '',
      authMode: 'none',
      avatar: 'L',
      models: [],
      selectedModelId: '',
    },
  },
];
export const DEFAULT_PROVIDERS: AiProvider[] = PROVIDER_PRESETS.filter((p) =>
  ['google', 'openai', 'anthropic'].includes(p.id)
).map((p) => ({
  ...p.provider,
  id: `${p.id}-default`,
  isSystem: true,
  catalogVersion: CATALOG_VERSION,
}));
