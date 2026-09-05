import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Check,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  Lightbulb,
  Wrench,
  Video,
  Headphones,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { AppSettings, AiProvider, DetectedModel, ModelCapability } from '../../../../types';
import { fetchProviderModels, detectModelCapabilities, getModelGroup } from '../../../../services/modelDetector';
import { AddProviderModal } from '../../AddProviderModal';

export interface ModelSettingsTabProps {
  localSettings: AppSettings;
  setLocalSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onTestConnection: (settings: AppSettings) => Promise<void>;
  t: (key: string) => string;
}

export const ModelSettingsTab: React.FC<ModelSettingsTabProps> = ({
  localSettings,
  setLocalSettings,
  onTestConnection,
  t
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Model & Provider states
  const [providerSearch, setProviderSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<'all' | ModelCapability>('all');
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [customModelInput, setCustomModelInput] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Derived current active provider
  const currentProvider: AiProvider = useMemo(() => {
    const list = localSettings.providers || [];
    const found = list.find(p => p.id === localSettings.activeProviderId);
    if (found) return found;
    if (list.length > 0) return list[0];
    return {
      id: 'default',
      name: localSettings.providerName || (localSettings.protocol === 'google' ? 'Google Gemini' : 'OpenAI 兼容'),
      protocol: localSettings.protocol,
      baseUrl: localSettings.baseUrl,
      apiKey: localSettings.apiKey,
      avatar: localSettings.protocol === 'google' ? 'G' : 'O',
      models: []
    };
  }, [localSettings.providers, localSettings.activeProviderId, localSettings.protocol, localSettings.baseUrl, localSettings.apiKey, localSettings.providerName]);

  // Filtered providers
  const filteredProviders = useMemo(() => {
    const list = localSettings.providers || [];
    if (!providerSearch.trim()) return list;
    const query = providerSearch.toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(query) || p.protocol.toLowerCase().includes(query));
  }, [localSettings.providers, providerSearch]);

  // Provider's models
  const providerModels = useMemo(() => currentProvider.models || [], [currentProvider.models]);

  // Model counts by capability
  const capabilityCounts = useMemo(() => {
    const c: Record<string, number> = {
      all: providerModels.length,
      vision: 0,
      text: 0,
      reasoning: 0,
      tools: 0,
      video: 0,
      audio: 0
    };
    providerModels.forEach(m => {
      m.capabilities.forEach(cap => {
        if (c[cap] !== undefined) c[cap]++;
      });
    });
    return c;
  }, [providerModels]);

  // Filtered models
  const filteredModels = useMemo(() => {
    return providerModels.filter(m => {
      const matchSearch =
        m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
        (m.name && m.name.toLowerCase().includes(modelSearch.toLowerCase()));
      if (!matchSearch) return false;
      if (selectedCapability === 'all') return true;
      return m.capabilities.includes(selectedCapability);
    });
  }, [providerModels, modelSearch, selectedCapability]);

  // Grouped models
  const groupedModels = useMemo(() => {
    const groups: Record<string, DetectedModel[]> = {};
    filteredModels.forEach(m => {
      const g = m.group || 'other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    });
    return groups;
  }, [filteredModels]);

  // Switch Provider
  const handleSelectProvider = (provId: string) => {
    const target = (localSettings.providers || []).find(p => p.id === provId);
    if (!target) return;
    setTestResult(null);
    setFetchError(null);
    setLocalSettings(s => ({
      ...s,
      activeProviderId: target.id,
      providerName: target.name,
      protocol: target.protocol,
      baseUrl: target.baseUrl,
      apiKey: target.apiKey,
      customHeaders: target.customHeaders,
      model: target.models && target.models.length > 0 ? target.models[0].id : s.model
    }));
  };

  // Update current provider fields
  const handleUpdateCurrentProvider = (fields: Partial<AiProvider>) => {
    setLocalSettings(s => {
      const updatedProviders = (s.providers || []).map(p => {
        if (p.id === currentProvider.id) {
          return { ...p, ...fields };
        }
        return p;
      });
      return {
        ...s,
        ...fields,
        providers: updatedProviders
      };
    });
  };

  // Add new provider
  const handleAddProvider = (newProv: AiProvider) => {
    setLocalSettings(s => ({
      ...s,
      providers: [...(s.providers || []), newProv],
      activeProviderId: newProv.id,
      providerName: newProv.name,
      protocol: newProv.protocol,
      baseUrl: newProv.baseUrl,
      apiKey: newProv.apiKey,
      customHeaders: newProv.customHeaders,
      model: newProv.models && newProv.models.length > 0 ? newProv.models[0].id : s.model
    }));
    setIsAddProviderOpen(false);
  };

  // Delete custom provider
  const handleDeleteProvider = (e: React.MouseEvent, providerId: string) => {
    e.stopPropagation();
    const target = (localSettings.providers || []).find(p => p.id === providerId);
    if (!target) return;
    if (confirm(`确定要删除服务商「${target.name}」吗？`)) {
      setLocalSettings(s => {
        const remaining = (s.providers || []).filter(p => p.id !== providerId);
        const nextActive = remaining.length > 0 ? remaining[0] : null;
        return {
          ...s,
          providers: remaining,
          activeProviderId: nextActive ? nextActive.id : '',
          providerName: nextActive ? nextActive.name : '',
          protocol: nextActive ? nextActive.protocol : s.protocol,
          baseUrl: nextActive ? nextActive.baseUrl : s.baseUrl,
          apiKey: nextActive ? nextActive.apiKey : '',
          model: nextActive?.models?.[0]?.id || s.model
        };
      });
    }
  };

  // Fetch models from endpoint (Cherry Studio style)
  const handleFetchModels = async () => {
    if (!currentProvider.apiKey && currentProvider.protocol === 'google') {
      setFetchError('请输入 Google Gemini API Key 后再拉取模型');
      return;
    }
    setIsFetchingModels(true);
    setFetchError(null);
    try {
      const detected = await fetchProviderModels(
        currentProvider.protocol,
        currentProvider.baseUrl,
        currentProvider.apiKey,
        currentProvider.customHeaders
      );
      if (detected.length === 0) {
        setFetchError('未从该端点检测到可用模型');
      } else {
        // Save into current provider
        setLocalSettings(s => {
          const updated = (s.providers || []).map(p => {
            if (p.id === currentProvider.id) {
              return { ...p, models: detected };
            }
            return p;
          });
          // If current model is not in list, auto-select first vision model or first model
          const visionModel = detected.find(m => m.capabilities.includes('vision'));
          const nextModel = s.model && detected.some(m => m.id === s.model)
            ? s.model
            : (visionModel?.id || detected[0].id);

          return {
            ...s,
            providers: updated,
            model: nextModel
          };
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setFetchError(error.message || '检测模型失败，请检查网络或 API Key');
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Add custom manual model
  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    const id = customModelInput.trim();
    if (!id) return;

    if (providerModels.some(m => m.id.toLowerCase() === id.toLowerCase())) {
      setLocalSettings(s => ({ ...s, model: id }));
      setCustomModelInput('');
      return;
    }

    const newModel: DetectedModel = {
      id,
      name: id,
      capabilities: detectModelCapabilities(id),
      group: getModelGroup(id)
    };

    const updatedModels = [newModel, ...providerModels];
    setLocalSettings(s => {
      const updatedProviders = (s.providers || []).map(p => {
        if (p.id === currentProvider.id) {
          return { ...p, models: updatedModels };
        }
        return p;
      });
      return {
        ...s,
        providers: updatedProviders,
        model: id
      };
    });
    setCustomModelInput('');
  };

  // Remove single model
  const handleRemoveModel = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    const updatedModels = providerModels.filter(m => m.id !== modelId);
    setLocalSettings(s => {
      const updatedProviders = (s.providers || []).map(p => {
        if (p.id === currentProvider.id) {
          return { ...p, models: updatedModels };
        }
        return p;
      });
      return {
        ...s,
        providers: updatedProviders,
        model: s.model === modelId ? (updatedModels[0]?.id || '') : s.model
      };
    });
  };

  // Clear all models for provider
  const handleClearAllModels = () => {
    if (confirm(`确定清空「${currentProvider.name}」已保存的所有模型吗？`)) {
      setLocalSettings(s => {
        const updatedProviders = (s.providers || []).map(p => {
          if (p.id === currentProvider.id) {
            return { ...p, models: [] };
          }
          return p;
        });
        return {
          ...s,
          providers: updatedProviders
        };
      });
    }
  };

  // Toggle group collapse
  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Test connection
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await onTestConnection(localSettings);
      setTestResult({ success: true, msg: '连接成功！模型与端点响应正常。' });
    } catch (err: unknown) {
      const error = err as Error;
      setTestResult({ success: false, msg: error.message || '连接失败，请检查配置。' });
    } finally {
      setIsTesting(false);
    }
  };

  // Copy API key
  const handleCopyKey = () => {
    if (!currentProvider.apiKey) return;
    navigator.clipboard.writeText(currentProvider.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-black/[0.06] dark:divide-white/[0.08]">
      {/* Left Sub-Sidebar: Provider List */}
      <div className="w-full md:w-72 lg:w-80 shrink-0 bg-[#fafafa] dark:bg-[#151518] flex flex-col">
        {/* Search Provider */}
        <div className="p-3.5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={providerSearch}
              onChange={e => setProviderSearch(e.target.value)}
              placeholder="搜索模型平台..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1e1e22] text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all placeholder-zinc-400"
            />
          </div>
        </div>

        {/* Provider Items Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1.5">
          {filteredProviders.map(p => {
            const isSelected = p.id === currentProvider.id;
            const isConfigured = Boolean(p.apiKey);
            const isGlobalActive = p.id === localSettings.activeProviderId;

            return (
              <div
                key={p.id}
                onClick={() => handleSelectProvider(p.id)}
                className={`group relative p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-white dark:bg-[#222226] shadow-xs border border-black/[0.08] dark:border-white/[0.1]'
                    : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-sm flex items-center justify-center shrink-0">
                    {p.avatar || p.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {p.name}
                      </span>
                      {isGlobalActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="当前打标服务商" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                      <span>{p.protocol === 'google' ? 'Google' : 'OpenAI'}</span>
                      <span>·</span>
                      <span>{p.models?.length || 0} 个模型</span>
                    </div>
                  </div>
                </div>

                {/* Status dot & Delete button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    title={isConfigured ? '已配置 API Key' : '未填写 API Key'}
                    className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  />
                  {p.id !== 'google-default' && p.id !== 'openai-default' && p.id !== 'siliconflow-default' && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProvider(e, p.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded-lg transition-opacity"
                      title="删除此服务商"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Provider Button */}
        <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-[#fafafa] dark:bg-[#151518]">
          <button
            type="button"
            onClick={() => setIsAddProviderOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-black/[0.12] dark:border-white/[0.15] hover:border-black/[0.3] dark:border-white/[0.3] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2 bg-white/60 dark:bg-white/[0.02]"
          >
            <Plus className="w-4 h-4" />
            <span>添加服务商</span>
          </button>
        </div>
      </div>

      {/* Right Main Detail: Provider Config & Models */}
      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-white dark:bg-[#18181b]">
        {/* Provider Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-base flex items-center justify-center">
              {currentProvider.avatar || currentProvider.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {currentProvider.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-black/[0.06] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300">
                  {currentProvider.protocol === 'google' ? 'Google Gemini 官方' : 'OpenAI 兼容端点'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {currentProvider.protocol === 'google'
                  ? '原生 Google AI Studio 多模态协议'
                  : '支持 OpenAI、SiliconFlow、Ollama、OpenRouter 等兼容接口'}
              </p>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-2">
            {localSettings.activeProviderId === currentProvider.id ? (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> 当前生效服务商
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSelectProvider(currentProvider.id)}
                className="px-3.5 py-1.5 rounded-full border border-black/[0.1] dark:border-white/[0.15] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-all"
              >
                设为打标服务商
              </button>
            )}
          </div>
        </div>

        {/* API Credentials Card */}
        <div className="p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#fafafa] dark:bg-[#1a1a1e] space-y-4">
          {/* API Base URL */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('apiEndpoint')}
              </label>
              {currentProvider.protocol === 'openai_compatible' && (
                <div className="flex gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentProvider({ baseUrl: 'https://api.openai.com/v1' })}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline"
                  >
                    OpenAI
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentProvider({ baseUrl: 'https://api.siliconflow.cn/v1' })}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline"
                  >
                    硅基流动
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentProvider({ baseUrl: 'https://openrouter.ai/api/v1' })}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline"
                  >
                    OpenRouter
                  </button>
                </div>
              )}
            </div>

            {currentProvider.protocol === 'google' ? (
              <div className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] text-sm font-mono text-zinc-500">
                https://generativelanguage.googleapis.com
              </div>
            ) : (
              <input
                type="text"
                value={currentProvider.baseUrl || ''}
                onChange={e => {
                  handleUpdateCurrentProvider({ baseUrl: e.target.value });
                  if (localSettings.activeProviderId === currentProvider.id) {
                    setLocalSettings(s => ({ ...s, baseUrl: e.target.value }));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#202024] text-sm font-mono focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                placeholder="https://api.openai.com/v1"
              />
            )}
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              {t('apiKey')}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={currentProvider.apiKey || ''}
                  onChange={e => {
                    handleUpdateCurrentProvider({ apiKey: e.target.value });
                    if (localSettings.activeProviderId === currentProvider.id) {
                      setLocalSettings(s => ({ ...s, apiKey: e.target.value }));
                    }
                  }}
                  className="w-full pl-3.5 pr-20 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#202024] text-sm font-mono focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                  placeholder="sk-••••••••••••••••••••••••"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    title="复制密钥"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    title={showApiKey ? '隐藏' : '显示'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Connection Test Button */}
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !currentProvider.apiKey}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 flex items-center gap-1.5 shrink-0 shadow-2xs"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>测试连接</span>
              </button>
            </div>

            {/* Test feedback */}
            {testResult && (
              <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.msg}</span>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================= */}
        {/* Cherry Studio Integrated Model Hub                     */}
        {/* ======================================================= */}
        <div className="space-y-4 pt-2">
          {/* Model Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>可用模型列表</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-black/[0.05] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300">
                  {providerModels.length}
                </span>
              </h4>
              {fetchError && (
                <span className="text-xs text-rose-500 truncate max-w-xs">{fetchError}</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={isFetchingModels || !currentProvider.apiKey}
                className="px-3 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-40"
              >
                {isFetchingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{isFetchingModels ? '检测中...' : '获取模型列表'}</span>
              </button>

              {providerModels.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllModels}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                  title="清空当前模型列表"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search and Capability Filter Pills (Aligned with Cherry Studio) */}
          <div className="space-y-2.5">
            {/* Search box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={modelSearch}
                onChange={e => setModelSearch(e.target.value)}
                placeholder="搜索模型 ID 或名称..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1a1a1e] text-sm focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder-zinc-400"
              />
              {modelSearch && (
                <button
                  type="button"
                  onClick={() => setModelSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCapability('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCapability === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                    : 'bg-black/[0.03] dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                }`}
              >
                全部 {capabilityCounts.all}
              </button>

              {/* Vision: Highlighted as Recommended for Captioning */}
              <button
                type="button"
                onClick={() => setSelectedCapability('vision')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  selectedCapability === 'vision'
                    ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-400/30'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>视觉 (打标推荐) {capabilityCounts.vision}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCapability('text')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  selectedCapability === 'text'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                    : 'bg-black/[0.03] dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>纯文本 {capabilityCounts.text}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCapability('reasoning')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  selectedCapability === 'reasoning'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-100'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>推理 {capabilityCounts.reasoning}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCapability('tools')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  selectedCapability === 'tools'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-100'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>工具 {capabilityCounts.tools}</span>
              </button>

              {capabilityCounts.video > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCapability('video')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    selectedCapability === 'video'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>视频 {capabilityCounts.video}</span>
                </button>
              )}

              {capabilityCounts.audio > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCapability('audio')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    selectedCapability === 'audio'
                      ? 'bg-cyan-600 text-white shadow-2xs'
                      : 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>音频 {capabilityCounts.audio}</span>
                </button>
              )}
            </div>
          </div>

          {/* Models List */}
          <div className="space-y-4">
            {providerModels.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-black/[0.1] dark:border-white/[0.1] text-center space-y-3 bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-zinc-500">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    尚未获取此服务商的模型列表
                  </div>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    点击下方「立即拉取」或上方「获取模型列表」，从端点自动检索模型及多模态能力。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={isFetchingModels || !currentProvider.apiKey}
                  className="px-5 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold transition-all shadow-2xs disabled:opacity-40"
                >
                  {isFetchingModels ? '正在拉取...' : '立即拉取模型'}
                </button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">
                没有找到匹配条件「{modelSearch || selectedCapability}」的模型
              </div>
            ) : (
              Object.entries(groupedModels).map(([group, groupModels]) => {
                const isCollapsed = collapsedGroups[group] || false;
                return (
                  <div key={group} className="space-y-1.5">
                    {/* Group Header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors w-full text-left py-1"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      <span className="font-mono">{group}</span>
                      <span className="px-1.5 py-0.2 rounded bg-black/[0.04] dark:bg-white/[0.06] text-xs">
                        {groupModels.length}
                      </span>
                      <div className="flex-1 h-px bg-black/[0.04] dark:bg-white/[0.05]" />
                    </button>

                    {/* Group Models */}
                    {!isCollapsed && (
                      <div className="space-y-1.5">
                        {groupModels.map(m => {
                          const isSelected = localSettings.model.toLowerCase() === m.id.toLowerCase();
                          const hasVision = m.capabilities.includes('vision');

                          return (
                            <div
                              key={m.id}
                              onClick={() => setLocalSettings(s => ({ ...s, model: m.id }))}
                              className={`group p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-black/[0.02] dark:bg-white/[0.03] border-zinc-900 dark:border-white ring-1 ring-zinc-900 dark:ring-white shadow-2xs'
                                  : 'bg-white dark:bg-[#1f1f23] border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.18] dark:hover:border-white/[0.2]'
                              }`}
                            >
                              {/* Left: Icon & Name */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                    hasVision
                                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                  }`}
                                >
                                  {hasVision ? <Eye className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                      {m.name}
                                    </span>
                                    {isSelected && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-medium shrink-0">
                                        当前打标模型
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 truncate">
                                      {m.id}
                                    </span>
                                    {!hasVision && isSelected && (
                                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                        ⚠️ 纯文本模型，不建议用于反推打标
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Middle: Capabilities */}
                              <div className="flex items-center gap-1 shrink-0">
                                {m.capabilities.includes('vision') && (
                                  <span
                                    title="支持图像视觉输入 (打标可用)"
                                    className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" /> 视觉
                                  </span>
                                )}
                                {m.capabilities.includes('reasoning') && (
                                  <span
                                    title="深度推理/思考模型"
                                    className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"
                                  >
                                    <Lightbulb className="w-3 h-3" />
                                  </span>
                                )}
                                {m.capabilities.includes('tools') && (
                                  <span
                                    title="工具调用"
                                    className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center"
                                  >
                                    <Wrench className="w-3 h-3" />
                                  </span>
                                )}
                                {m.capabilities.includes('video') && (
                                  <span
                                    title="视频能力"
                                    className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center"
                                  >
                                    <Video className="w-3 h-3" />
                                  </span>
                                )}
                                {m.capabilities.includes('audio') && (
                                  <span
                                    title="音频能力"
                                    className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center"
                                  >
                                    <Headphones className="w-3 h-3" />
                                  </span>
                                )}
                              </div>

                              {/* Right: Actions */}
                              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLocalSettings(s => ({ ...s, model: m.id }));
                                    }}
                                    className="text-xs px-2.5 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.04] text-zinc-700 dark:text-zinc-300 font-medium transition-all"
                                  >
                                    设为打标
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveModel(e, m.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-opacity"
                                  title="从列表中移除"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Manual Model Add Form */}
          <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
            <form onSubmit={handleAddCustomModel} className="flex gap-2">
              <input
                type="text"
                value={customModelInput}
                onChange={e => setCustomModelInput(e.target.value)}
                placeholder="未在列表中？直接输入自定义模型 ID (如 qwen2.5-vl-72b-instruct)..."
                className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1a1a1e] focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none placeholder-zinc-400"
              />
              <button
                type="submit"
                disabled={!customModelInput.trim()}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 shrink-0"
              >
                添加模型
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Add Provider Modal */}
      {isAddProviderOpen && (
        <AddProviderModal
          isOpen={isAddProviderOpen}
          onClose={() => setIsAddProviderOpen(false)}
          onAddProvider={handleAddProvider}
        />
      )}
    </div>
  );
};
