import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { MODEL_BLUEPRINTS } from '../data/modelSpecs';
import {
  EXTERNAL_PROVIDER_PRESETS,
  PROTOCOL_LABELS,
  STUDIO_GEMINI_PROVIDER,
  fetchProviderModels,
  resolveProviderUrl,
  testProviderConnection,
} from '../services/providerEngine';
import {
  AiProvider,
  AppSettings,
  AuthMode,
  CustomPromptPreset,
  Language,
  ProviderProtocol,
  SpecTuningConfig,
  TargetModelId,
} from '../types/prompt';
import {
  DEFAULT_TUNING_BY_MODEL,
  buildCompiledSystemInstruction,
  getEffectiveTuning,
} from '../utils/promptBuilder';

export type SettingsTabId = 'providers' | 'specs' | 'general';

interface SettingsWindowProps {
  isOpen: boolean;
  initialTab?: SettingsTabId;
  initialSpecModel?: TargetModelId;
  onClose: () => void;
  settings: AppSettings;
  onSave: (patch: Partial<AppSettings>) => void;
  language: Language;
  t: (key: string) => string;
}

const MODEL_IDS: TargetModelId[] = [
  'krea2',
  'moss_prose',
  'moss_layout',
  'flux_dit',
  'anima',
  'lora_hybrid',
  'danbooru_tags',
];

export const SettingsWindow: React.FC<SettingsWindowProps> = ({
  isOpen,
  initialTab = 'providers',
  initialSpecModel = 'krea2',
  onClose,
  settings,
  onSave,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  // Providers draft state
  const [providers, setProviders] = useState<AiProvider[]>(settings.providers);
  const [activeProviderId, setActiveProviderId] = useState(settings.activeProviderId);
  const [selectedProviderId, setSelectedProviderId] = useState(settings.activeProviderId);
  const [showAddPresetMenu, setShowAddPresetMenu] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingMode, setTestingMode] = useState<'vision' | 'text' | null>(null);
  const [diagResult, setDiagResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Spec tuning & custom presets draft state
  const [selectedSpecModel, setSelectedSpecModel] =
    useState<TargetModelId>(initialSpecModel);
  const [modelTunings, setModelTunings] = useState<
    Partial<Record<TargetModelId, SpecTuningConfig>>
  >(settings.modelTunings || {});
  const [customPresets, setCustomPresets] = useState<CustomPromptPreset[]>(
    settings.customPresets || []
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(
    settings.activePresetId ?? null
  );
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // General draft state
  const [concurrency, setConcurrency] = useState(settings.concurrency);
  const [customInstruction, setCustomInstruction] = useState(settings.customInstruction);
  const [blockedText, setBlockedText] = useState(settings.blockedWords.join(', '));
  const [rules, setRules] = useState(settings.replacementRules);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedSpecModel(initialSpecModel);
      const list =
        settings.providers && settings.providers.length > 0
          ? settings.providers
          : [STUDIO_GEMINI_PROVIDER];
      setProviders(list);
      setActiveProviderId(settings.activeProviderId || list[0].id);
      setSelectedProviderId(settings.activeProviderId || list[0].id);
      setModelTunings(settings.modelTunings || {});
      setCustomPresets(settings.customPresets || []);
      setActivePresetId(settings.activePresetId ?? null);
      setConcurrency(settings.concurrency);
      setCustomInstruction(settings.customInstruction);
      setBlockedText(settings.blockedWords.join(', '));
      setRules(settings.replacementRules);
      setDiagResult(null);
      setShowAddPresetMenu(false);
      setIsSavingPreset(false);
    }
  }, [isOpen, initialTab, initialSpecModel, settings]);

  const currentProvider = useMemo(
    () => providers.find((p) => p.id === selectedProviderId) || providers[0],
    [providers, selectedProviderId]
  );

  const currentTuning = useMemo(
    () => getEffectiveTuning(selectedSpecModel, modelTunings),
    [selectedSpecModel, modelTunings]
  );

  const generatedPreviewInstruction = useMemo(
    () =>
      buildCompiledSystemInstruction({
        targetModel: selectedSpecModel,
        kreaVariant: settings.kreaVariant,
        tuning: currentTuning,
      }),
    [selectedSpecModel, settings.kreaVariant, currentTuning]
  );

  if (!isOpen) return null;

  const zh = language === 'zh';

  const patchSelectedProvider = (patch: Partial<AiProvider>) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === currentProvider.id ? { ...p, ...patch } : p))
    );
    setDiagResult(null);
  };

  const handleAddExternalProvider = (presetId: string) => {
    const preset = EXTERNAL_PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const created: AiProvider = {
      ...preset.provider,
      id: `${preset.id}_${Date.now()}`,
    };
    setProviders((prev) => [...prev, created]);
    setSelectedProviderId(created.id);
    setActiveProviderId(created.id);
    setShowAddPresetMenu(false);
    setDiagResult(null);
  };

  const handleDeleteProvider = (id: string) => {
    const remaining = providers.filter((p) => p.id !== id);
    if (remaining.length === 0) return;
    setProviders(remaining);
    if (selectedProviderId === id) setSelectedProviderId(remaining[0].id);
    if (activeProviderId === id) setActiveProviderId(remaining[0].id);
  };

  const handleFetchModels = async () => {
    if (!currentProvider) return;
    setFetchingModels(true);
    setDiagResult(null);
    try {
      const models = await fetchProviderModels(currentProvider);
      patchSelectedProvider({
        availableModels: models,
        selectedModelId:
          currentProvider.selectedModelId || models[0] || '',
      });
      setDiagResult({
        ok: true,
        message: zh
          ? `成功拉取 ${models.length} 个模型`
          : `Fetched ${models.length} models`,
      });
    } catch (err) {
      setDiagResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to fetch models',
      });
    } finally {
      setFetchingModels(false);
    }
  };

  const handleTestConnection = async (mode: 'vision' | 'text') => {
    if (!currentProvider) return;
    setTestingMode(mode);
    setDiagResult(null);
    try {
      const res = await testProviderConnection(currentProvider, mode);
      setDiagResult({
        ok: true,
        message: `${res.model} · ${res.latencyMs}ms · ${res.preview}`,
      });
    } catch (err) {
      setDiagResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setTestingMode(null);
    }
  };

  const patchTuning = (patch: Partial<SpecTuningConfig>) => {
    setModelTunings((prev) => ({
      ...prev,
      [selectedSpecModel]: {
        ...getEffectiveTuning(selectedSpecModel, prev),
        ...patch,
      },
    }));
  };

  const handleResetSpecDefault = () => {
    setModelTunings((prev) => ({
      ...prev,
      [selectedSpecModel]: { ...DEFAULT_TUNING_BY_MODEL[selectedSpecModel] },
    }));
  };

  const handleCreateCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const preset: CustomPromptPreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      baseModel: selectedSpecModel,
      kreaVariant: selectedSpecModel === 'krea2' ? settings.kreaVariant : undefined,
      tuning: { ...currentTuning },
      promptTemplate: generatedPreviewInstruction,
    };
    setCustomPresets((prev) => [...prev, preset]);
    setActivePresetId(preset.id);
    setNewPresetName('');
    setIsSavingPreset(false);
  };

  const handleSaveAll = () => {
    onSave({
      providers,
      activeProviderId,
      modelTunings,
      customPresets,
      activePresetId,
      concurrency,
      customInstruction: customInstruction.trim(),
      blockedWords: blockedText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      replacementRules: rules.filter((r) => r.pattern.trim()),
    });
    onClose();
  };

  let resolvedEndpoint = '';
  try {
    resolvedEndpoint = currentProvider
      ? resolveProviderUrl(currentProvider, 'generate')
      : '';
  } catch (err) {
    resolvedEndpoint = err instanceof Error ? err.message : '';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-xs">
      <div
        className="w-full max-w-5xl h-[86vh] max-h-[820px] rounded-3xl border flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-primary)',
          borderColor: 'var(--separator-hairline)',
          boxShadow: 'var(--shadow-sheet)',
        }}
      >
        {/* Top Vibrancy Sheet Header */}
        <div
          className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 shrink-0"
          style={{
            backgroundColor: 'var(--surface-secondary)',
            borderColor: 'var(--separator-hairline)',
          }}
        >
          <div>
            <h2
              className="text-[17px] font-semibold tracking-tight"
              style={{ color: 'var(--label-primary)' }}
            >
              {zh ? 'API 引擎与规范微调中心' : 'API Engines & Spec Tuning'}
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: 'var(--label-secondary)' }}
            >
              {zh
                ? '配置自有视觉打标 API、自由微调模型提示词规范与组合预设'
                : 'Configure custom vision APIs, fine-tune model rules, and manage presets'}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div
            className="flex items-center p-1 rounded-xl"
            style={{ backgroundColor: 'var(--surface-grouped)' }}
          >
            {(
              [
                ['providers', zh ? '模型与 API 服务' : 'API Providers', Cpu],
                ['specs', zh ? '规范微调与预设' : 'Spec Tuning', Sparkles],
                ['general', zh ? '通用与并发' : 'General', SlidersHorizontal],
              ] as [SettingsTabId, string, typeof Cpu][]
            ).map(([id, label, Icon]) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer"
                  style={{
                    backgroundColor: active
                      ? 'var(--surface-primary)'
                      : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--label-secondary)',
                    boxShadow: active ? 'var(--shadow-control)' : 'none',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            style={{ color: 'var(--label-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* TAB 1: PROVIDERS */}
          {activeTab === 'providers' && (
            <>
              <div
                className="w-64 shrink-0 border-r p-4 overflow-y-auto space-y-3"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  borderColor: 'var(--separator-hairline)',
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: 'var(--label-secondary)' }}
                  >
                    {zh ? '已配置引擎' : 'Configured Engines'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddPresetMenu((v) => !v)}
                    className="inline-flex items-center gap-1 text-[12px] font-medium cursor-pointer"
                    style={{ color: 'var(--accent)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{zh ? '添加 API' : 'Add API'}</span>
                  </button>
                </div>

                {showAddPresetMenu && (
                  <div
                    className="rounded-xl border p-2 space-y-1"
                    style={{
                      backgroundColor: 'var(--surface-primary)',
                      borderColor: 'var(--separator-hairline)',
                      boxShadow: 'var(--shadow-control)',
                    }}
                  >
                    {EXTERNAL_PROVIDER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleAddExternalProvider(preset.id)}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <div
                          className="text-[12px] font-medium"
                          style={{ color: 'var(--label-primary)' }}
                        >
                          {zh ? preset.labelZh : preset.labelEn}
                        </div>
                        <div
                          className="text-[11px] truncate"
                          style={{ color: 'var(--label-tertiary)' }}
                        >
                          {zh ? preset.descZh : preset.descEn}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  {providers.map((p) => {
                    const isViewing = p.id === currentProvider?.id;
                    const isActiveEngine = p.id === activeProviderId;
                    return (
                      <div
                        key={p.id}
                        className="group flex items-center justify-between rounded-xl transition-colors"
                        style={{
                          backgroundColor: isViewing
                            ? 'var(--surface-primary)'
                            : 'transparent',
                          boxShadow: isViewing ? 'var(--shadow-control)' : 'none',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProviderId(p.id);
                            setDiagResult(null);
                          }}
                          className="flex-1 min-w-0 text-left px-3 py-2.5 cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-[13px] font-medium truncate"
                              style={{
                                color: isViewing
                                  ? 'var(--accent)'
                                  : 'var(--label-primary)',
                              }}
                            >
                              {p.name}
                            </span>
                            {isActiveEngine && (
                              <Check
                                className="w-3.5 h-3.5 shrink-0"
                                style={{ color: 'var(--semantic-green)' }}
                              />
                            )}
                          </div>
                          <div
                            className="text-[11px] truncate mt-0.5 font-mono"
                            style={{ color: 'var(--label-tertiary)' }}
                          >
                            {p.selectedModelId || 'No model'}
                          </div>
                        </button>
                        {!p.isBuiltIn && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProvider(p.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 mr-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                            style={{ color: 'var(--label-tertiary)' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Provider Detail Form */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {currentProvider && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3
                          className="text-[16px] font-semibold"
                          style={{ color: 'var(--label-primary)' }}
                        >
                          {currentProvider.name}
                        </h3>
                        <p
                          className="text-[12px] mt-0.5"
                          style={{ color: 'var(--label-secondary)' }}
                        >
                          {PROTOCOL_LABELS[currentProvider.protocol]}
                        </p>
                      </div>

                      {activeProviderId === currentProvider.id ? (
                        <span
                          className="text-[12px] font-semibold inline-flex items-center gap-1.5"
                          style={{ color: 'var(--semantic-green)' }}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {zh ? '当前已启用此引擎打标' : 'Active Tagging Engine'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveProviderId(currentProvider.id)}
                          className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium text-white cursor-pointer"
                          style={{ backgroundColor: 'var(--accent)' }}
                        >
                          {zh ? '设为当前打标引擎' : 'Set as Active Engine'}
                        </button>
                      )}
                    </div>

                    {currentProvider.protocol === 'studio_gemini' ? (
                      <div
                        className="p-5 rounded-2xl border space-y-2.5"
                        style={{
                          backgroundColor: 'var(--surface-secondary)',
                          borderColor: 'var(--separator-hairline)',
                        }}
                      >
                        <p
                          className="text-[14px] font-medium"
                          style={{ color: 'var(--label-primary)' }}
                        >
                          {zh
                            ? '内置服务端 Gemini 4 Hydrogen 引擎（免填写密钥）'
                            : 'Built-in Server-Side Gemini 4 Hydrogen Engine'}
                        </p>
                        <p
                          className="text-[13px] leading-relaxed"
                          style={{ color: 'var(--label-secondary)' }}
                        >
                          {zh
                            ? '开箱即用，自动通过服务端环境变量认证。如需切换为本地 Ollama、LM Studio、硅基流动、OpenRouter 或自建 OpenAI 兼容网关，请点击左侧「添加 API」。'
                            : 'Ready out of the box via server runtime credentials. To use local Ollama, LM Studio, OpenRouter, SiliconFlow, or custom gateways, click Add API on the left.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label
                              className="text-[12px] font-medium block"
                              style={{ color: 'var(--label-secondary)' }}
                            >
                              {zh ? '服务商名称' : 'Provider Name'}
                            </label>
                            <input
                              type="text"
                              value={currentProvider.name}
                              onChange={(e) =>
                                patchSelectedProvider({ name: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border text-[13px] apple-focus"
                              style={{
                                backgroundColor: 'var(--surface-secondary)',
                                borderColor: 'var(--separator-hairline)',
                                color: 'var(--label-primary)',
                              }}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label
                              className="text-[12px] font-medium block"
                              style={{ color: 'var(--label-secondary)' }}
                            >
                              {zh ? 'API 协议' : 'Protocol'}
                            </label>
                            <select
                              value={currentProvider.protocol}
                              onChange={(e) =>
                                patchSelectedProvider({
                                  protocol: e.target.value as ProviderProtocol,
                                })
                              }
                              className="w-full px-3 py-2 rounded-xl border text-[13px] apple-focus"
                              style={{
                                backgroundColor: 'var(--surface-secondary)',
                                borderColor: 'var(--separator-hairline)',
                                color: 'var(--label-primary)',
                              }}
                            >
                              <option value="openai_compatible">
                                OpenAI Compatible (/chat/completions)
                              </option>
                              <option value="openai_responses">
                                OpenAI Responses (/responses)
                              </option>
                              <option value="anthropic">
                                Anthropic Messages (/messages)
                              </option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label
                            className="text-[12px] font-medium block"
                            style={{ color: 'var(--label-secondary)' }}
                          >
                            {zh ? 'API 接口地址 (Base URL)' : 'Endpoint Base URL'}
                          </label>
                          <input
                            type="url"
                            value={currentProvider.baseUrl}
                            onChange={(e) =>
                              patchSelectedProvider({ baseUrl: e.target.value })
                            }
                            placeholder="https://api.example.com/v1"
                            className="w-full px-3 py-2 rounded-xl border text-[13px] font-mono apple-focus"
                            style={{
                              backgroundColor: 'var(--surface-secondary)',
                              borderColor: 'var(--separator-hairline)',
                              color: 'var(--label-primary)',
                            }}
                          />
                          {resolvedEndpoint && (
                            <p
                              className="text-[11px] font-mono truncate"
                              style={{ color: 'var(--label-tertiary)' }}
                            >
                              → {resolvedEndpoint}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label
                              className="text-[12px] font-medium block"
                              style={{ color: 'var(--label-secondary)' }}
                            >
                              {zh ? '鉴权方式' : 'Auth Header'}
                            </label>
                            <select
                              value={currentProvider.authMode}
                              onChange={(e) =>
                                patchSelectedProvider({
                                  authMode: e.target.value as AuthMode,
                                })
                              }
                              className="w-full px-3 py-2 rounded-xl border text-[13px] apple-focus"
                              style={{
                                backgroundColor: 'var(--surface-secondary)',
                                borderColor: 'var(--separator-hairline)',
                                color: 'var(--label-primary)',
                              }}
                            >
                              <option value="auto">
                                {zh ? '跟随协议自动选择' : 'Auto by protocol'}
                              </option>
                              <option value="bearer">Authorization: Bearer</option>
                              <option value="x-api-key">x-api-key</option>
                              <option value="api-key">api-key</option>
                              <option value="none">
                                {zh ? '无需鉴权（Ollama / 本地）' : 'None (Local)'}
                              </option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label
                              className="text-[12px] font-medium block"
                              style={{ color: 'var(--label-secondary)' }}
                            >
                              {zh ? '访问凭据 (Token)' : 'Access Credential'}
                            </label>
                            <div className="relative">
                              <input
                                type={showSecret ? 'text' : 'password'}
                                value={currentProvider.apiKey}
                                onChange={(e) =>
                                  patchSelectedProvider({ apiKey: e.target.value })
                                }
                                disabled={currentProvider.authMode === 'none'}
                                placeholder={
                                  currentProvider.authMode === 'none'
                                    ? zh
                                      ? '本地免密模式无需填写'
                                      : 'Not needed in local mode'
                                    : 'sk-...'
                                }
                                className="w-full pl-3 pr-9 py-2 rounded-xl border text-[13px] font-mono apple-focus disabled:opacity-50"
                                style={{
                                  backgroundColor: 'var(--surface-secondary)',
                                  borderColor: 'var(--separator-hairline)',
                                  color: 'var(--label-primary)',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowSecret((v) => !v)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                                style={{ color: 'var(--label-tertiary)' }}
                              >
                                {showSecret ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Model Selection & Fetching */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label
                              className="text-[12px] font-medium"
                              style={{ color: 'var(--label-secondary)' }}
                            >
                              {zh ? '视觉模型 ID' : 'Vision Model ID'}
                            </label>
                            <button
                              type="button"
                              disabled={fetchingModels}
                              onClick={handleFetchModels}
                              className="inline-flex items-center gap-1.5 text-[12px] font-medium cursor-pointer disabled:opacity-50"
                              style={{ color: 'var(--accent)' }}
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${
                                  fetchingModels ? 'animate-spin' : ''
                                }`}
                              />
                              <span>
                                {zh ? '拉取平台模型列表' : 'Fetch Models'}
                              </span>
                            </button>
                          </div>

                          <input
                            type="text"
                            value={currentProvider.selectedModelId}
                            onChange={(e) =>
                              patchSelectedProvider({
                                selectedModelId: e.target.value,
                              })
                            }
                            placeholder="e.g. gpt-4o-mini / Qwen/Qwen2.5-VL-72B-Instruct / llava"
                            className="w-full px-3 py-2 rounded-xl border text-[13px] font-mono apple-focus"
                            style={{
                              backgroundColor: 'var(--surface-secondary)',
                              borderColor: 'var(--separator-hairline)',
                              color: 'var(--label-primary)',
                            }}
                          />

                          {currentProvider.availableModels.length > 0 && (
                            <div
                              className="max-h-32 overflow-y-auto rounded-xl border p-1.5 divide-y"
                              style={{
                                backgroundColor: 'var(--surface-secondary)',
                                borderColor: 'var(--separator-hairline)',
                              }}
                            >
                              {currentProvider.availableModels
                                .slice(0, 40)
                                .map((modelId) => {
                                  const selected =
                                    currentProvider.selectedModelId === modelId;
                                  return (
                                    <button
                                      key={modelId}
                                      type="button"
                                      onClick={() =>
                                        patchSelectedProvider({
                                          selectedModelId: modelId,
                                        })
                                      }
                                      className="w-full text-left px-2.5 py-1.5 text-[12px] font-mono flex items-center justify-between hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer"
                                      style={{
                                        color: selected
                                          ? 'var(--accent)'
                                          : 'var(--label-primary)',
                                        borderColor: 'var(--separator-hairline)',
                                      }}
                                    >
                                      <span className="truncate">{modelId}</span>
                                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Connection Diagnostic Test */}
                    <div
                      className="pt-4 border-t space-y-3"
                      style={{ borderColor: 'var(--separator-hairline)' }}
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          disabled={testingMode !== null}
                          onClick={() => handleTestConnection('vision')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer disabled:opacity-50"
                          style={{
                            borderColor: 'var(--separator-hairline)',
                            backgroundColor: 'var(--surface-secondary)',
                            color: 'var(--label-primary)',
                          }}
                        >
                          {testingMode === 'vision' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          <span>{zh ? '测试视觉图片调用' : 'Test Vision Call'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={testingMode !== null}
                          onClick={() => handleTestConnection('text')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer disabled:opacity-50"
                          style={{
                            borderColor: 'var(--separator-hairline)',
                            backgroundColor: 'var(--surface-secondary)',
                            color: 'var(--label-primary)',
                          }}
                        >
                          {testingMode === 'text' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          <span>{zh ? '测试文本连通' : 'Test Text Ping'}</span>
                        </button>
                      </div>

                      {diagResult && (
                        <div
                          className="p-3 rounded-xl border text-[12px] font-mono break-words"
                          style={{
                            borderColor: diagResult.ok
                              ? 'color-mix(in srgb, var(--semantic-green) 35%, transparent)'
                              : 'color-mix(in srgb, var(--semantic-red) 35%, transparent)',
                            backgroundColor: diagResult.ok
                              ? 'color-mix(in srgb, var(--semantic-green) 8%, transparent)'
                              : 'color-mix(in srgb, var(--semantic-red) 8%, transparent)',
                            color: diagResult.ok
                              ? 'var(--semantic-green)'
                              : 'var(--semantic-red)',
                          }}
                        >
                          {diagResult.message}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* TAB 2: SPEC TUNING & CUSTOM PRESETS */}
          {activeTab === 'specs' && (
            <>
              <div
                className="w-64 shrink-0 border-r p-4 overflow-y-auto space-y-5"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  borderColor: 'var(--separator-hairline)',
                }}
              >
                <div className="space-y-1">
                  <span
                    className="text-[12px] font-semibold px-2 block mb-1.5"
                    style={{ color: 'var(--label-secondary)' }}
                  >
                    {zh ? '内置模型规范' : 'Built-in Model Specs'}
                  </span>
                  {MODEL_IDS.map((mId) => {
                    const spec = MODEL_BLUEPRINTS[mId];
                    const active = selectedSpecModel === mId;
                    const hasOverride = Boolean(
                      modelTunings[mId]?.systemPromptOverride?.trim() ||
                        modelTunings[mId]?.extraDirective?.trim()
                    );
                    return (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => setSelectedSpecModel(mId)}
                        className="w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer"
                        style={{
                          backgroundColor: active
                            ? 'var(--surface-primary)'
                            : 'transparent',
                          boxShadow: active ? 'var(--shadow-control)' : 'none',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-[13px] font-medium truncate"
                            style={{
                              color: active
                                ? 'var(--accent)'
                                : 'var(--label-primary)',
                            }}
                          >
                            {zh ? spec.nameZh : spec.nameEn}
                          </span>
                          {hasOverride && (
                            <span
                              className="text-[11px]"
                              style={{ color: 'var(--accent)' }}
                            >
                              *
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Presets Section */}
                <div
                  className="pt-4 border-t space-y-2"
                  style={{ borderColor: 'var(--separator-hairline)' }}
                >
                  <span
                    className="text-[12px] font-semibold px-2 block"
                    style={{ color: 'var(--label-secondary)' }}
                  >
                    {zh ? '自定义组合预设' : 'Custom Presets'} ({customPresets.length})
                  </span>
                  {customPresets.length === 0 ? (
                    <p
                      className="text-[12px] px-2 leading-relaxed"
                      style={{ color: 'var(--label-tertiary)' }}
                    >
                      {zh
                        ? '调整右侧搭配参数后点击「另存为预设」，即可随时一键调用。'
                        : 'Tune options on the right and click Save as Preset.'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {customPresets.map((preset) => {
                        const isActive = activePresetId === preset.id;
                        return (
                          <div
                            key={preset.id}
                            className="group flex items-center justify-between rounded-xl px-2.5 py-2"
                            style={{
                              backgroundColor: isActive
                                ? 'var(--accent-tint)'
                                : 'transparent',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSpecModel(preset.baseModel);
                                setModelTunings((prev) => ({
                                  ...prev,
                                  [preset.baseModel]: {
                                    ...preset.tuning,
                                    systemPromptOverride: preset.promptTemplate,
                                  },
                                }));
                                setActivePresetId(isActive ? null : preset.id);
                              }}
                              className="flex-1 min-w-0 text-left cursor-pointer"
                            >
                              <div
                                className="text-[12px] font-medium truncate"
                                style={{
                                  color: isActive
                                    ? 'var(--accent)'
                                    : 'var(--label-primary)',
                                }}
                              >
                                {preset.name}
                              </div>
                              <div
                                className="text-[11px] truncate"
                                style={{ color: 'var(--label-tertiary)' }}
                              >
                                {MODEL_BLUEPRINTS[preset.baseModel].badgeText}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomPresets((prev) =>
                                  prev.filter((p) => p.id !== preset.id)
                                );
                                if (activePresetId === preset.id) {
                                  setActivePresetId(null);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                              style={{ color: 'var(--label-tertiary)' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Tuning Canvas */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3
                      className="text-[16px] font-semibold"
                      style={{ color: 'var(--label-primary)' }}
                    >
                      {zh
                        ? MODEL_BLUEPRINTS[selectedSpecModel].nameZh
                        : MODEL_BLUEPRINTS[selectedSpecModel].nameEn}
                    </h3>
                    <p
                      className="text-[12px] mt-0.5"
                      style={{ color: 'var(--label-secondary)' }}
                    >
                      {zh
                        ? MODEL_BLUEPRINTS[selectedSpecModel].summaryZh
                        : MODEL_BLUEPRINTS[selectedSpecModel].summaryEn}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSavingPreset((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer"
                      style={{
                        borderColor: 'var(--separator-hairline)',
                        color: 'var(--accent)',
                        backgroundColor: 'var(--surface-secondary)',
                      }}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{zh ? '另存为预设' : 'Save Preset'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetSpecDefault}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer"
                      style={{
                        borderColor: 'var(--separator-hairline)',
                        color: 'var(--label-secondary)',
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{zh ? '恢复默认' : 'Reset'}</span>
                    </button>
                  </div>
                </div>

                {isSavingPreset && (
                  <form
                    onSubmit={handleCreateCustomPreset}
                    className="p-3.5 rounded-xl border flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--surface-secondary)',
                      borderColor: 'var(--accent)',
                    }}
                  >
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder={
                        zh
                          ? '输入预设名称（例如：Krea 2 建筑胶片风）'
                          : 'Preset name (e.g. Krea2 Architectural Film)'
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg border text-[13px] apple-focus"
                      style={{
                        backgroundColor: 'var(--surface-primary)',
                        borderColor: 'var(--separator-hairline)',
                        color: 'var(--label-primary)',
                      }}
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium text-white cursor-pointer"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      {zh ? '确认保存' : 'Save'}
                    </button>
                  </form>
                )}

                {/* Modular Fine-Tuning Switches */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span
                      className="text-[12px] font-medium block"
                      style={{ color: 'var(--label-secondary)' }}
                    >
                      {zh ? '描述篇幅与信息密度' : 'Prompt Length & Density'}
                    </span>
                    <div
                      className="grid grid-cols-3 p-0.5 rounded-lg"
                      style={{ backgroundColor: 'var(--surface-grouped)' }}
                    >
                      {(
                        [
                          ['concise', zh ? '简练 (40–65词)' : 'Concise'],
                          ['balanced', zh ? '均衡 (65–110词)' : 'Balanced'],
                          ['exhaustive', zh ? '详尽 (110–170词)' : 'Exhaustive'],
                        ] as [SpecTuningConfig['density'], string][]
                      ).map(([d, label]) => {
                        const active = currentTuning.density === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              patchTuning({
                                density: d,
                                systemPromptOverride: undefined,
                              })
                            }
                            className="py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer"
                            style={{
                              backgroundColor: active
                                ? 'var(--surface-primary)'
                                : 'transparent',
                              color: active
                                ? 'var(--accent)'
                                : 'var(--label-secondary)',
                              boxShadow: active ? 'var(--shadow-control)' : 'none',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Toggle Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        [
                          'emphasizeMaterials',
                          zh
                            ? '强调材质触感与表面光影'
                            : 'Emphasize tactile materials & light',
                        ],
                        [
                          'quoteTypography',
                          zh
                            ? '保留并用引号标注画面文字'
                            : 'Quote visible typography & signage',
                        ],
                        [
                          'includeOpticalLens',
                          zh
                            ? '描述光学焦段与景深关系'
                            : 'Include optical framing & DoF',
                        ],
                        [
                          'includeArtistOrMedium',
                          zh
                            ? '保留画师标签或开篇媒介锚点'
                            : 'Include medium opener / @artist anchor',
                        ],
                        [
                          'purePositiveOnly',
                          zh
                            ? '严格纯正向，剥离废词与负面词'
                            : 'Pure positive (strip quality spam)',
                        ],
                      ] as [keyof SpecTuningConfig, string][]
                    ).map(([field, label]) => {
                      const checked = Boolean(currentTuning[field]);
                      return (
                        <label
                          key={field}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer select-none"
                          style={{
                            backgroundColor: 'var(--surface-secondary)',
                            borderColor: checked
                              ? 'color-mix(in srgb, var(--accent) 45%, transparent)'
                              : 'var(--separator-hairline)',
                          }}
                        >
                          <span
                            className="text-[12px] font-medium"
                            style={{ color: 'var(--label-primary)' }}
                          >
                            {label}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              patchTuning({
                                [field]: e.target.checked,
                                systemPromptOverride: undefined,
                              })
                            }
                            className="accent-[#0071E3] w-4 h-4 cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-[12px] font-medium block"
                      style={{ color: 'var(--label-secondary)' }}
                    >
                      {zh
                        ? '该规范专属附加微调指令（例如：固定搭配 @nardack、突出建筑冷调光线）'
                        : 'Extra Model-Specific Directive'}
                    </label>
                    <input
                      type="text"
                      value={currentTuning.extraDirective}
                      onChange={(e) =>
                        patchTuning({
                          extraDirective: e.target.value,
                          systemPromptOverride: undefined,
                        })
                      }
                      placeholder={
                        zh
                          ? '输入针对当前模型的自定义约束或偏好…'
                          : 'Add a custom constraint for this target model…'
                      }
                      className="w-full px-3 py-2 rounded-xl border text-[13px] apple-focus"
                      style={{
                        backgroundColor: 'var(--surface-secondary)',
                        borderColor: 'var(--separator-hairline)',
                        color: 'var(--label-primary)',
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        className="text-[12px] font-medium"
                        style={{ color: 'var(--label-secondary)' }}
                      >
                        {zh
                          ? '最终系统编译指令（支持直接自由修改正文）'
                          : 'Compiled System Prompt (Editable Override)'}
                      </label>
                      {currentTuning.systemPromptOverride && (
                        <span
                          className="text-[11px] font-medium"
                          style={{ color: 'var(--accent)' }}
                        >
                          {zh ? '已启用手动微调覆盖' : 'Custom override active'}
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={7}
                      value={generatedPreviewInstruction}
                      onChange={(e) =>
                        patchTuning({ systemPromptOverride: e.target.value })
                      }
                      className="w-full p-3 rounded-xl border text-[12px] font-mono leading-relaxed resize-y apple-focus"
                      style={{
                        backgroundColor: 'var(--surface-secondary)',
                        borderColor: 'var(--separator-hairline)',
                        color: 'var(--label-primary)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 3: GENERAL & CLEANUP RULES */}
          {activeTab === 'general' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-2xl">
              <div className="space-y-1.5">
                <label
                  className="text-[12px] font-medium block"
                  style={{ color: 'var(--label-secondary)' }}
                >
                  {zh ? '并发编译通道数' : 'Concurrent Workers'}
                </label>
                <div
                  className="grid grid-cols-4 p-0.5 rounded-lg"
                  style={{ backgroundColor: 'var(--surface-grouped)' }}
                >
                  {[1, 2, 3, 4].map((count) => {
                    const active = concurrency === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setConcurrency(count)}
                        className="py-1.5 rounded-md text-[12px] font-medium apple-numeric transition-all cursor-pointer"
                        style={{
                          backgroundColor: active
                            ? 'var(--surface-primary)'
                            : 'transparent',
                          color: active
                            ? 'var(--accent)'
                            : 'var(--label-secondary)',
                          boxShadow: active ? 'var(--shadow-control)' : 'none',
                        }}
                      >
                        {count}×
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[12px] font-medium block"
                  style={{ color: 'var(--label-secondary)' }}
                >
                  {zh ? '全局附加编译指令' : 'Global Compilation Instruction'}
                </label>
                <textarea
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  rows={3}
                  placeholder={
                    zh
                      ? '对所有模型生效的全局备注，例如始终强调织物纹理…'
                      : 'Global constraint appended to every compilation…'
                  }
                  className="w-full p-3 rounded-xl border text-[13px] resize-y apple-focus"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    borderColor: 'var(--separator-hairline)',
                    color: 'var(--label-primary)',
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[12px] font-medium block"
                  style={{ color: 'var(--label-secondary)' }}
                >
                  {zh ? '自动屏蔽词（逗号分隔）' : 'Blocked Terms (comma-separated)'}
                </label>
                <input
                  type="text"
                  value={blockedText}
                  onChange={(e) => setBlockedText(e.target.value)}
                  placeholder="watermark, signature, blurry"
                  className="w-full px-3 py-2 rounded-xl border text-[13px] apple-focus"
                  style={{
                    backgroundColor: 'var(--surface-secondary)',
                    borderColor: 'var(--separator-hairline)',
                    color: 'var(--label-primary)',
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    className="text-[12px] font-medium"
                    style={{ color: 'var(--label-secondary)' }}
                  >
                    {zh ? '查找与替换规则' : 'Find & Replace Rules'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setRules([...rules, { pattern: '', replace: '' }])}
                    className="inline-flex items-center gap-1 text-[12px] font-medium cursor-pointer"
                    style={{ color: 'var(--accent)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{zh ? '添加规则' : 'Add Rule'}</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rule.pattern}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx] = { ...rule, pattern: e.target.value };
                          setRules(next);
                        }}
                        placeholder={zh ? '查找' : 'Find'}
                        className="flex-1 px-3 py-1.5 rounded-lg border text-[12px]"
                        style={{
                          backgroundColor: 'var(--surface-secondary)',
                          borderColor: 'var(--separator-hairline)',
                          color: 'var(--label-primary)',
                        }}
                      />
                      <input
                        type="text"
                        value={rule.replace}
                        onChange={(e) => {
                          const next = [...rules];
                          next[idx] = { ...rule, replace: e.target.value };
                          setRules(next);
                        }}
                        placeholder={zh ? '替换为' : 'Replace'}
                        className="flex-1 px-3 py-1.5 rounded-lg border text-[12px]"
                        style={{
                          backgroundColor: 'var(--surface-secondary)',
                          borderColor: 'var(--separator-hairline)',
                          color: 'var(--label-primary)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        style={{ color: 'var(--label-tertiary)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Summary & Save Footer */}
        <div
          className="px-6 py-3.5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0"
          style={{
            backgroundColor: 'var(--surface-secondary)',
            borderColor: 'var(--separator-hairline)',
          }}
        >
          <div
            className="text-[12px] flex items-center gap-2 min-w-0"
            style={{ color: 'var(--label-secondary)' }}
          >
            <span>{zh ? '当前打标引擎：' : 'Active Engine:'}</span>
            <span
              className="font-semibold truncate"
              style={{ color: 'var(--label-primary)' }}
            >
              {providers.find((p) => p.id === activeProviderId)?.name || 'Studio Gemini'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono truncate">
              {providers.find((p) => p.id === activeProviderId)?.selectedModelId ||
                'gemini-4-hydrogen'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] font-medium border cursor-pointer"
              style={{
                borderColor: 'var(--separator-hairline)',
                color: 'var(--label-primary)',
              }}
            >
              {zh ? '取消' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-lg text-[13px] font-medium text-white cursor-pointer"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {zh ? '保存配置' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
