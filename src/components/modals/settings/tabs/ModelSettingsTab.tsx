import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Play,
  Square,
  LoaderCircle,
  Check,
  ArrowRight,
} from 'lucide-react';
import { AiProvider, AppSettings, DetectedModel } from '../../../../types';
import {
  activeConnection,
  PROTOCOL_LABELS,
  redact,
} from '../../../../services/providers/connection';
import { testConnection, ConnectionTestResult } from '../../../../services/geminiService';
import { visionStatus } from '../../../../services/modelDetector';
import { useDialogs } from '../../../ui/DialogContext';
import { ProviderModal } from '../../AddProviderModal';
import { ConnectionForm } from '../api/ConnectionForm';
import { ModelManager } from '../api/ModelManager';

export interface ModelSettingsTabProps {
  localSettings: AppSettings;
  setLocalSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}
export const ModelSettingsTab: React.FC<ModelSettingsTabProps> = ({
  localSettings,
  setLocalSettings,
}) => {
  const { confirm, prompt } = useDialogs();
  const [selectedId, setSelectedId] = useState(
    localSettings.activeProviderId || localSettings.providers?.[0]?.id || ''
  );
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [testModel, setTestModel] = useState('');
  const [testMode, setTestMode] = useState<'vision' | 'text'>('vision');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const providers = localSettings.providers || [];
  const provider = providers.find((p) => p.id === selectedId);
  const fingerprint = JSON.stringify(
    provider && [
      provider.id,
      provider.protocol,
      provider.baseUrl,
      provider.apiKey,
      provider.authMode,
      provider.customHeaders,
      provider.endpointMode,
      provider.requestBodyJson,
      provider.requestBody,
      provider.maxOutputTokens,
      provider.requestTimeoutSec,
    ]
  );
  useEffect(() => {
    request.current?.abort();
    setResult(null);
    setError('');
    setBusy(false);
    return () => request.current?.abort();
  }, [fingerprint, testModel, testMode]);
  const preferredTestModel =
    provider?.selectedModelId || provider?.models?.find((m) => m.enabled !== false)?.id || '';
  useEffect(() => {
    setTestModel(preferredTestModel);
  }, [provider?.id, preferredTestModel]);
  const availableTestModels = (provider?.models || [])
    .filter((m) => m.enabled !== false)
    .map((m) => m.id)
    .join('\n');
  useEffect(() => {
    const ids = availableTestModels.split('\n').filter(Boolean);
    setTestModel((current) => (ids.includes(current) ? current : ids[0] || ''));
  }, [availableTestModels]);
  const patchProvider = (patch: Partial<AiProvider>) =>
    setLocalSettings((s) =>
      activeConnection({
        ...s,
        providers: (s.providers || []).map((p) => (p.id === selectedId ? { ...p, ...patch } : p)),
      })
    );
  const activate = async (model: DetectedModel) => {
    if (!provider) return;
    if (
      visionStatus(model) === 'unknown' &&
      !(await confirm(
        '无法从模型信息确认图片支持。仍设为打标模型？建议先使用“图片调用”测试，并核对服务商文档。'
      ))
    )
      return;
    setLocalSettings((s) =>
      activeConnection({
        ...s,
        activeProviderId: provider.id,
        providers: (s.providers || []).map((p) =>
          p.id === provider.id ? { ...p, selectedModelId: model.id, enabled: true } : p
        ),
      })
    );
  };
  const runTest = async () => {
    if (!provider) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setResult(null);
    setError('');
    try {
      // Test a draft connection, never the globally active provider. Testing does not activate a model.
      const diagnostic = {
        ...localSettings,
        providers: [{ ...provider, selectedModelId: testModel }],
        activeProviderId: provider.id,
      };
      const tested = await testConnection(diagnostic, controller.signal, testMode);
      if (!controller.signal.aborted) setResult(tested);
    } catch (err) {
      if (!controller.signal.aborted) setError(redact((err as Error).message, provider));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className='api-workspace'>
      <aside className='api-provider-sidebar'>
        <div className='api-section-heading'>
          <h3>
            服务商 <span className='api-count'>{providers.length}</span>
          </h3>
          <button
            type='button'
            className='tm-button api-icon-button'
            aria-label='添加服务商'
            onClick={() => setAdding(true)}
          >
            <Plus size={18} />
          </button>
        </div>
        <label className='api-search'>
          <Search size={15} />
          <input
            className='tm-input'
            placeholder='搜索服务商'
            aria-label='搜索服务商'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <nav className='api-provider-nav' aria-label='服务商列表'>
          {providers
            .filter((p) => `${p.name} ${p.protocol}`.toLowerCase().includes(search.toLowerCase()))
            .map((p) => (
              <button
                type='button'
                className='tm-button api-provider-item'
                key={p.id}
                aria-current={selectedId === p.id ? 'true' : undefined}
                onClick={() => setSelectedId(p.id)}
              >
                <span className='api-provider-avatar'>{p.name.slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {(p.models || []).length} 个模型
                    {localSettings.activeProviderId === p.id ? ' · 当前打标' : ''}
                  </small>
                </span>
                {localSettings.activeProviderId === p.id && <Check size={14} />}
              </button>
            ))}
        </nav>
        <div className='api-sidebar-tip'>
          切换浏览不会切换打标模型。
          <br />
          请选择模型后点击“设为打标模型”。
        </div>
        <button
          type='button'
          className='tm-button api-button api-outline api-add-button'
          onClick={() => setAdding(true)}
        >
          <Plus size={15} />
          添加服务商
        </button>
      </aside>
      <main className='api-provider-main'>
        {!provider ? (
          <div className='api-empty'>
            <h2>添加第一个服务商</h2>
            <p>支持 Gemini、OpenAI、Claude 与兼容网关。</p>
            <button
              className='tm-button tm-button-primary api-button'
              type='button'
              onClick={() => setAdding(true)}
            >
              添加服务商
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <>
            <header className='api-provider-heading'>
              <div>
                <h2>{provider.name}</h2>
                <p>
                  {PROTOCOL_LABELS[provider.protocol]}{' '}
                  {localSettings.activeProviderId === provider.id && (
                    <span className='api-active-badge'>当前打标服务商</span>
                  )}
                </p>
              </div>
              <div className='api-actions'>
                <button
                  type='button'
                  className='tm-button api-icon-button'
                  aria-label='重命名服务商'
                  onClick={async () => {
                    const name = await prompt('服务商显示名称', provider.name);
                    if (name?.trim()) patchProvider({ name: name.trim() });
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type='button'
                  className='tm-button api-icon-button'
                  aria-label='删除服务商'
                  onClick={async () => {
                    if (
                      !(await confirm(
                        `删除 ${provider.name} 及其本地连接配置？${localSettings.activeProviderId === provider.id ? '当前打标配置会清空，需重新选择模型。' : ''}`
                      ))
                    )
                      return;
                    const remaining = providers.filter((p) => p.id !== provider.id);
                    setLocalSettings((s) => ({
                      ...s,
                      providers: remaining,
                      ...(s.activeProviderId === provider.id
                        ? {
                            activeProviderId: '',
                            model: '',
                            apiKey: '',
                            customHeaders: [],
                            providerName: '未选择',
                            baseUrl: '',
                            requestBody: undefined,
                            requestBodyJson: undefined,
                          }
                        : {}),
                    }));
                    setSelectedId(remaining[0]?.id || '');
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </header>
            <ConnectionForm
              key={`connection-${provider.id}`}
              provider={provider}
              onChange={patchProvider}
            />
            <section className='api-test-section'>
              <div className='api-section-heading'>
                <div>
                  <h3>测试连接与模型</h3>
                  <p>使用当前未保存配置。测试不切换打标模型。</p>
                </div>
              </div>
              <div className='api-test-controls'>
                <label className='api-field'>
                  测试模型
                  <select
                    className='tm-input'
                    value={testModel}
                    onChange={(e) => setTestModel(e.target.value)}
                  >
                    <option value=''>选择已添加模型</option>
                    {(provider.models || [])
                      .filter((m) => m.enabled !== false)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.id}
                        </option>
                      ))}
                  </select>
                </label>
                <label className='api-field'>
                  测试类型
                  <select
                    className='tm-input'
                    value={testMode}
                    onChange={(e) => setTestMode(e.target.value as 'vision' | 'text')}
                  >
                    <option value='vision'>图片调用</option>
                    <option value='text'>纯文本连接</option>
                  </select>
                </label>
                {busy ? (
                  <button
                    type='button'
                    className='tm-button api-button api-outline'
                    onClick={() => {
                      request.current?.abort();
                      setBusy(false);
                    }}
                  >
                    <Square size={14} />
                    停止测试
                  </button>
                ) : (
                  <button
                    type='button'
                    className='tm-button api-button api-outline'
                    disabled={!testModel}
                    onClick={runTest}
                  >
                    <Play size={14} />
                    测试调用
                  </button>
                )}
              </div>
              <p className='api-note'>
                一次真实 API 请求，可能计费。图片测试仅发送内置 64×64
                色块，不发送你的素材；结果仅用于诊断，不保证标注质量。
              </p>
              {busy && (
                <p className='api-test-result' role='status'>
                  <LoaderCircle className='animate-spin' size={15} />
                  请求中… 可随时停止；停止不能撤回远端已经处理的请求。
                </p>
              )}
              {error && (
                <div className='api-error' role='alert'>
                  {error}
                </div>
              )}
              {result && (
                <div className='api-test-result' role='status'>
                  <Check size={16} />
                  <div>
                    <strong>
                      {result.mode === 'vision'
                        ? '图片请求已接受并返回文本'
                        : '文本调用成功（未验证图片）'}{' '}
                      · {(result.latencyMs / 1000).toFixed(2)}s
                    </strong>
                    <p className='api-mono'>{result.model}</p>
                    <blockquote>{result.preview}</blockquote>
                  </div>
                </div>
              )}
            </section>
            <ModelManager
              key={`models-${provider.id}`}
              provider={provider}
              activeModel={
                localSettings.activeProviderId === provider.id ? localSettings.model : undefined
              }
              onChange={patchProvider}
              onActivate={activate}
            />
          </>
        )}
      </main>
      {adding && (
        <ProviderModal
          isOpen
          onClose={() => setAdding(false)}
          onSaveProvider={(p) => {
            setLocalSettings((s) => ({ ...s, providers: [...(s.providers || []), p] }));
            setSelectedId(p.id);
            setSearch('');
          }}
        />
      )}
    </div>
  );
};
