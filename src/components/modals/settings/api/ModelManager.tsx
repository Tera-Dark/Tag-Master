import { useEffect, useRef, useState } from 'react';
import { Download, Plus, Search, X, Pencil, Trash2, Check, LoaderCircle } from 'lucide-react';
import { AiProvider, DetectedModel } from '../../../../types';
import {
  detectModelCapabilities,
  discoverModels,
  getModelGroup,
  visionStatus,
} from '../../../../services/modelDetector';
import { redact } from '../../../../services/providers/connection';
import { DialogOverlay } from '../../../ui/DialogOverlay';
import { useDialogs } from '../../../ui/DialogContext';

export function ModelManager({
  provider,
  activeModel,
  onChange,
  onActivate,
}: {
  provider: AiProvider;
  activeModel?: string;
  onChange: (patch: Partial<AiProvider>) => void;
  onActivate: (model: DetectedModel) => void;
}) {
  const { confirm, alert } = useDialogs();
  const [library, setLibrary] = useState(false);
  const [available, setAvailable] = useState<DetectedModel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [visionOnly, setVisionOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [editor, setEditor] = useState<DetectedModel | null>(null);
  const [originalId, setOriginalId] = useState('');
  const controller = useRef<AbortController | null>(null);
  const fingerprint = JSON.stringify([
    provider.id,
    provider.protocol,
    provider.baseUrl,
    provider.apiKey,
    provider.authMode,
    provider.customHeaders,
    provider.modelsUrl,
    provider.endpointMode,
  ]);
  useEffect(() => {
    controller.current?.abort();
    setAvailable([]);
    setLoaded(false);
    setError('');
    setBusy(false);
    return () => controller.current?.abort();
  }, [fingerprint]);
  const models = provider.models || [];
  const fetchList = async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError('');
    try {
      const found = await discoverModels(provider, request.signal);
      if (!request.signal.aborted) {
        setAvailable(found);
        setLoaded(true);
        setSelected(new Set());
      }
    } catch (err) {
      if (!request.signal.aborted) setError(redact((err as Error).message, provider));
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  };
  const closeLibrary = () => {
    controller.current?.abort();
    setBusy(false);
    setLibrary(false);
  };
  const filtered = available.filter(
    (m) =>
      (!visionOnly || visionStatus(m) !== 'unsupported') &&
      `${m.id} ${m.name}`.toLowerCase().includes(query.toLowerCase())
  );
  const capabilityLabel = (m: DetectedModel) =>
    visionStatus(m) === 'unsupported'
      ? '不推荐图片打标'
      : visionStatus(m) === 'unknown'
        ? '图片能力待确认'
        : `图片 · ${m.visionMode === 'enabled' ? '手动指定' : m.capabilitySource === 'provider' ? '平台声明' : m.source === 'preset' ? '内置预设' : '名称推测'}`;
  return (
    <section className='api-model-manager'>
      <div className='api-section-heading'>
        <div>
          <h3>
            打标模型 <span className='api-count'>{models.length}</span>
          </h3>
          <p>添加到这里，再明确指定一个当前打标模型。</p>
        </div>
        <div className='api-actions'>
          <button
            type='button'
            className='tm-button api-button'
            onClick={() => {
              setOriginalId('');
              setEditor({
                id: '',
                name: '',
                capabilities: [],
                source: 'manual',
                visionMode: 'auto',
              });
            }}
          >
            <Plus size={15} />
            手动添加
          </button>
          <button
            type='button'
            className='tm-button api-button api-outline'
            onClick={() => setLibrary(true)}
          >
            <Download size={15} />
            获取模型
          </button>
        </div>
      </div>
      {!models.length && (
        <div className='api-empty'>
          还没有添加模型。可以获取服务商列表，也可以直接输入模型 ID。
          <br />
          <span>列表接口不是必需的，手动添加后即可测试调用。</span>
        </div>
      )}
      <div className='api-model-list'>
        {models.map((m) => (
          <div className='api-model-row' key={m.id} data-active={m.id === activeModel}>
            <div className='api-model-identity'>
              <strong>{m.name || m.id}</strong>
              <code>{m.id}</code>
              <span className='api-note'>
                {m.enabled === false ? '已停用 · ' : ''}
                {capabilityLabel(m)}
              </span>
            </div>
            <div className='api-model-actions'>
              {m.id === activeModel ? (
                <span className='api-active-badge'>
                  <Check size={13} />
                  当前打标
                </span>
              ) : (
                <button
                  type='button'
                  className='tm-button api-button'
                  disabled={m.enabled === false || visionStatus(m) === 'unsupported'}
                  onClick={() => onActivate(m)}
                >
                  设为打标模型
                </button>
              )}
              <button
                type='button'
                className='tm-button api-icon-button'
                aria-label={`编辑模型 ${m.id}`}
                onClick={() => {
                  setOriginalId(m.id);
                  setEditor({ ...m });
                }}
              >
                <Pencil size={14} />
              </button>
              <button
                type='button'
                className='tm-button api-icon-button'
                aria-label={`移除模型 ${m.id}`}
                onClick={async () => {
                  if (m.id === activeModel) {
                    await alert('请先选择另一个打标模型，再移除当前模型。');
                    return;
                  }
                  if (await confirm(`从此服务商移除 ${m.id}？不会删除远端模型。`))
                    onChange({
                      models: models.filter((item) => item.id !== m.id),
                      ...(provider.selectedModelId === m.id ? { selectedModelId: '' } : {}),
                    });
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className='api-note'>
        预设与名称推测不代表账号权限。建议先测试图片调用；未知模型可手动确认图片支持。
      </p>
      {library && (
        <DialogOverlay
          label='获取模型'
          onClose={closeLibrary}
          className='fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4'
        >
          <div className='api-library-dialog'>
            <header className='api-section-heading'>
              <div>
                <h2>获取模型</h2>
                <p>{provider.name} · 列表可访问不等于模型可调用</p>
              </div>
              <button
                type='button'
                className='tm-button api-icon-button'
                aria-label='关闭模型列表'
                onClick={closeLibrary}
              >
                <X size={18} />
              </button>
            </header>
            <div className='api-library-tools'>
              <label className='api-search'>
                <Search size={15} />
                <input
                  className='tm-input'
                  aria-label='搜索远端模型'
                  placeholder='搜索模型名称或 ID'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <button
                type='button'
                className='tm-button api-button api-outline'
                disabled={busy}
                onClick={fetchList}
              >
                {busy ? (
                  <LoaderCircle className='animate-spin' size={15} />
                ) : (
                  <Download size={15} />
                )}{' '}
                {loaded ? '刷新列表' : '获取远端列表'}
              </button>
            </div>
            <label className='api-checkbox'>
              <input
                type='checkbox'
                checked={visionOnly}
                onChange={(e) => setVisionOnly(e.target.checked)}
              />
              排除已知非图片打标模型（保留未知能力）
            </label>
            {busy && (
              <p className='api-note' role='status'>
                正在读取模型列表…{' '}
                <button
                  type='button'
                  className='tm-button api-button'
                  onClick={() => {
                    controller.current?.abort();
                    setBusy(false);
                  }}
                >
                  停止获取
                </button>
              </p>
            )}
            {error && (
              <p className='api-error' role='alert'>
                {error}
              </p>
            )}
            <div className='api-library-list'>
              {filtered.slice(0, 250).map((m) => {
                const added = models.some((saved) => saved.id === m.id);
                return (
                  <label className='api-library-row' key={m.id}>
                    <input
                      type='checkbox'
                      checked={added || selected.has(m.id)}
                      disabled={added}
                      onChange={(e) =>
                        setSelected((previous) => {
                          const next = new Set(previous);
                          if (e.target.checked) next.add(m.id);
                          else next.delete(m.id);
                          return next;
                        })
                      }
                    />
                    <span>
                      <strong>{m.name}</strong>
                      <code>{m.id}</code>
                      <small>{capabilityLabel(m)}</small>
                    </span>
                    {added && <small>已添加</small>}
                  </label>
                );
              })}
              {!filtered.length && (
                <div className='api-empty'>
                  {loaded
                    ? '没有符合条件的模型。试试清空搜索或关闭筛选。'
                    : '点击「获取远端列表」读取账号可见的模型。'}
                  <br />
                  获取失败也可以返回后手动添加。
                </div>
              )}
              {filtered.length > 250 && (
                <p className='api-note'>
                  匹配 {filtered.length} 项，显示前 250 项；请搜索缩小范围。
                </p>
              )}
            </div>
            <footer className='api-dialog-footer'>
              <span className='api-note'>
                {available.length} 个远端模型 · 新选 {selected.size} 个
              </span>
              <button
                type='button'
                className='tm-button tm-button-primary api-button'
                disabled={!selected.size}
                onClick={() => {
                  onChange({
                    models: [
                      ...models,
                      ...available.filter(
                        (m) => selected.has(m.id) && !models.some((old) => old.id === m.id)
                      ),
                    ],
                  });
                  closeLibrary();
                }}
              >
                添加所选模型
              </button>
            </footer>
          </div>
        </DialogOverlay>
      )}
      {editor && (
        <DialogOverlay
          label={originalId ? '编辑模型' : '手动添加模型'}
          onClose={() => setEditor(null)}
          className='fixed inset-0 z-[260] flex items-center justify-center bg-black/50 p-4'
        >
          <form
            className='api-editor-dialog'
            onSubmit={(e) => {
              e.preventDefault();
              const id = editor.id.trim();
              if (!id) return;
              if (!originalId && models.some((m) => m.id === id)) {
                void alert('这个模型 ID 已经存在，可直接编辑已有模型。');
                return;
              }
              if (
                id === activeModel &&
                (editor.enabled === false || editor.visionMode === 'disabled')
              ) {
                void alert('请先选择其他打标模型，再停用当前模型。');
                return;
              }
              const edited = {
                ...editor,
                id,
                name: editor.name.trim() || id,
                capabilities: originalId ? editor.capabilities : detectModelCapabilities(id),
                group: getModelGroup(id),
              };
              onChange({
                models: originalId
                  ? models.map((m) => (m.id === originalId ? edited : m))
                  : [...models, edited],
              });
              setEditor(null);
            }}
          >
            <header className='api-section-heading'>
              <h2>{originalId ? '编辑模型' : '手动添加模型'}</h2>
              <button
                type='button'
                className='tm-button api-icon-button'
                aria-label='关闭模型编辑'
                onClick={() => setEditor(null)}
              >
                <X size={18} />
              </button>
            </header>
            <label className='api-field'>
              模型 ID
              <input
                autoFocus
                required
                className='tm-input api-mono'
                value={editor.id}
                readOnly={!!originalId}
                placeholder='例如 gemini-3.8-flash 或网关模型别名'
                onChange={(e) => setEditor({ ...editor, id: e.target.value })}
              />
            </label>
            <label className='api-field'>
              显示名称（可选）
              <input
                className='tm-input'
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
              />
            </label>
            <label className='api-field'>
              图片输入能力
              <select
                className='tm-input'
                value={editor.visionMode || 'auto'}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    visionMode: e.target.value as DetectedModel['visionMode'],
                  })
                }
              >
                <option value='auto'>自动判断（非调用验证）</option>
                <option value='enabled'>手动指定：支持图片</option>
                <option value='disabled'>不支持图片</option>
              </select>
            </label>
            <label className='api-checkbox'>
              <input
                type='checkbox'
                checked={editor.enabled !== false}
                onChange={(e) => setEditor({ ...editor, enabled: e.target.checked })}
              />
              启用此模型
            </label>
            <p className='api-note'>
              模型 ID 必须与服务商实际接受的名称一致。选择“支持图片”不会赋予模型新的能力。
            </p>
            <footer className='api-dialog-footer'>
              <button
                className='tm-button api-button'
                type='button'
                onClick={() => setEditor(null)}
              >
                取消
              </button>
              <button className='tm-button tm-button-primary api-button' type='submit'>
                保存模型
              </button>
            </footer>
          </form>
        </DialogOverlay>
      )}
    </section>
  );
}
