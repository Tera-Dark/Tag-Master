import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, ChevronDown, Check, Trash2, Palette, Sparkles } from 'lucide-react';
import { AiProvider, AiProtocol } from '../../types';

export interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProvider: (provider: AiProvider) => void;
  onDeleteProvider?: (providerId: string) => void;
  initialProvider?: AiProvider | null;
}

export interface AddProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProvider: (provider: AiProvider) => void;
}

interface Preset {
  name: string;
  protocol: AiProtocol;
  baseUrl: string;
  avatarChar: string;
  avatarBg: string;
}

const AVATAR_COLOR_PRESETS = [
  { name: '暗曜黑', bg: '#18181b', text: '#ffffff' },
  { name: '极光绿', bg: '#10b981', text: '#ffffff' },
  { name: '深海蓝', bg: '#2563eb', text: '#ffffff' },
  { name: '星空靛', bg: '#6366f1', text: '#ffffff' },
  { name: '紫罗兰', bg: '#8b5cf6', text: '#ffffff' },
  { name: '樱花粉', bg: '#ec4899', text: '#ffffff' },
  { name: '玫瑰红', bg: '#f43f5e', text: '#ffffff' },
  { name: '琥珀橙', bg: '#f59e0b', text: '#ffffff' },
  { name: '薄荷青', bg: '#06b6d4', text: '#ffffff' },
  { name: '松石绿', bg: '#14b8a6', text: '#ffffff' },
  { name: '赤焰红', bg: '#dc2626', text: '#ffffff' },
  { name: '石板灰', bg: '#475569', text: '#ffffff' },
  { name: '素雅白', bg: '#f4f4f5', text: '#18181b' },
];

const PRESETS: Preset[] = [
  {
    name: 'SiliconFlow (硅基流动)',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.siliconflow.cn/v1',
    avatarChar: '硅',
    avatarBg: '#6366f1'
  },
  {
    name: 'Ollama (本地部署)',
    protocol: 'openai_compatible',
    baseUrl: 'http://localhost:11434/v1',
    avatarChar: '🦙',
    avatarBg: '#10b981'
  },
  {
    name: 'DeepSeek (深度求索)',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    avatarChar: 'D',
    avatarBg: '#2563eb'
  },
  {
    name: 'OpenRouter (全球聚合)',
    protocol: 'openai_compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    avatarChar: 'R',
    avatarBg: '#8b5cf6'
  },
  {
    name: 'OpenAI (官方)',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.openai.com/v1',
    avatarChar: 'O',
    avatarBg: '#10a37f'
  },
  {
    name: 'Google Gemini (官方)',
    protocol: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com',
    avatarChar: 'G',
    avatarBg: '#1e88e5'
  },
  {
    name: 'xAI / Grok',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.x.ai/v1',
    avatarChar: 'X',
    avatarBg: '#18181b'
  },
  {
    name: 'Moonshot (月之暗面)',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.moonshot.cn/v1',
    avatarChar: '月',
    avatarBg: '#06b6d4'
  }
];

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  onSaveProvider,
  onDeleteProvider,
  initialProvider
}) => {
  const isEdit = Boolean(initialProvider);

  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [protocol, setProtocol] = useState<AiProtocol>('openai_compatible');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [showApiKey, setShowApiKey] = useState(false);
  const [avatarChar, setAvatarChar] = useState('P');
  const [avatarBg, setAvatarBg] = useState('#18181b');
  const [avatarColor, setAvatarColor] = useState('#ffffff');
  const [showMore, setShowMore] = useState(false);
  const [customHeadersText, setCustomHeadersText] = useState('');

  const colorInputRef = useRef<HTMLInputElement>(null);

  // Sync state on open or initialProvider change
  useEffect(() => {
    if (isOpen) {
      if (initialProvider) {
        setName(initialProvider.name || '');
        setApiKey(initialProvider.apiKey || '');
        setProtocol(initialProvider.protocol || 'openai_compatible');
        setBaseUrl(initialProvider.baseUrl || '');
        setAvatarChar(initialProvider.avatar || initialProvider.name?.charAt(0) || 'P');
        setAvatarBg(initialProvider.avatarBg || '#18181b');
        setAvatarColor(initialProvider.avatarColor || '#ffffff');
        if (initialProvider.customHeaders && initialProvider.customHeaders.length > 0) {
          setShowMore(true);
          const headerLines = initialProvider.customHeaders.map(h => `${h.key}: ${h.value}`).join('\n');
          setCustomHeadersText(headerLines);
        } else {
          setCustomHeadersText('');
          setShowMore(false);
        }
      } else {
        // Reset to default for Add mode
        setName('');
        setApiKey('');
        setProtocol('openai_compatible');
        setBaseUrl('https://api.openai.com/v1');
        setAvatarChar('P');
        setAvatarBg('#6366f1');
        setAvatarColor('#ffffff');
        setCustomHeadersText('');
        setShowMore(false);
      }
      setShowApiKey(false);
    }
  }, [isOpen, initialProvider]);

  if (!isOpen) return null;

  const handleSelectPreset = (p: Preset) => {
    setName(p.name);
    setProtocol(p.protocol);
    setBaseUrl(p.baseUrl);
    setAvatarChar(p.avatarChar);
    setAvatarBg(p.avatarBg);
    setAvatarColor(p.avatarBg === '#f4f4f5' ? '#18181b' : '#ffffff');
  };

  const handleSelectColor = (bg: string, text = '#ffffff') => {
    setAvatarBg(bg);
    setAvatarColor(text);
  };

  const handleCustomColorChange = (hex: string) => {
    setAvatarBg(hex);
    // Simple brightness calculation to auto determine text color
    const c = hex.replace('#', '');
    if (c.length === 6) {
      const r = parseInt(c.substr(0, 2), 16);
      const g = parseInt(c.substr(2, 2), 16);
      const b = parseInt(c.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      setAvatarColor(brightness > 160 ? '#18181b' : '#ffffff');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let headers: { key: string; value: string }[] | undefined = undefined;
    if (customHeadersText.trim()) {
      try {
        const parsed = JSON.parse(customHeadersText);
        if (typeof parsed === 'object' && parsed !== null) {
          headers = Object.entries(parsed).map(([key, value]) => ({
            key,
            value: String(value)
          }));
        }
      } catch {
        // Line-based format: "Header: Value"
        headers = customHeadersText
          .split('\n')
          .filter(l => l.includes(':'))
          .map(l => {
            const [k, ...v] = l.split(':');
            return { key: k.trim(), value: v.join(':').trim() };
          });
      }
    }

    const providerData: AiProvider = {
      id: initialProvider?.id || ('provider-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)),
      name: name.trim(),
      protocol,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      avatar: avatarChar.trim() || name.trim().charAt(0) || 'P',
      avatarBg,
      avatarColor,
      customHeaders: headers,
      models: initialProvider?.models || [],
      isSystem: initialProvider?.isSystem || false
    };

    onSaveProvider(providerData);
    onClose();
  };

  const handleDelete = () => {
    if (!initialProvider) return;
    if (confirm(`确定要删除服务商「${initialProvider.name}」吗？`)) {
      onDeleteProvider?.(initialProvider.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[260] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 ease-out">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-zinc-800 dark:text-zinc-200 font-bold text-sm">
              {isEdit ? '✏️' : '✨'}
            </span>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isEdit ? '编辑服务商' : '添加自定义服务商'}
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {isEdit ? '自定义名称、头像文字与背景配色' : '配置第三方 OpenAI 兼容或 Google 端点'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* Avatar & Color Customization Section */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3.5">
            <div className="flex items-center gap-4">
              {/* Live Avatar Preview */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-md shrink-0 transition-all"
                style={{ backgroundColor: avatarBg, color: avatarColor }}
              >
                {avatarChar || name.charAt(0) || 'P'}
              </div>

              {/* Avatar Character Input */}
              <div className="flex-1 min-w-0 space-y-1">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>头像字符 / 图标</span>
                  <span className="text-[10px] text-zinc-400 font-normal">支持字母 / 汉字 / Emoji</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={avatarChar}
                  onChange={e => setAvatarChar(e.target.value)}
                  placeholder="例如 P / 幸 / 🌿 / ⚡"
                  className="w-full px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#202024] text-sm font-semibold focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder-zinc-400"
                />
              </div>
            </div>

            {/* Avatar Color Palette */}
            <div className="space-y-1.5 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5" />
                  <span>头像背景配色</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">{avatarBg}</span>
                  <button
                    type="button"
                    onClick={() => colorInputRef.current?.click()}
                    className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline decoration-dashed"
                  >
                    自定义颜色
                  </button>
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={avatarBg}
                    onChange={e => handleCustomColorChange(e.target.value)}
                    className="sr-only"
                  />
                </div>
              </div>

              {/* Preset Color Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {AVATAR_COLOR_PRESETS.map(preset => {
                  const isSelected = avatarBg.toLowerCase() === preset.bg.toLowerCase();
                  return (
                    <button
                      key={preset.bg}
                      type="button"
                      onClick={() => handleSelectColor(preset.bg, preset.text)}
                      title={preset.name}
                      className={`w-7 h-7 rounded-full shadow-2xs transition-all flex items-center justify-center relative ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-white scale-110'
                          : 'hover:scale-110 opacity-90 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: preset.bg }}
                    >
                      {isSelected && (
                        <Check
                          className="w-3.5 h-3.5 stroke-[3]"
                          style={{ color: preset.text }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Presets (Only in Add mode) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>快捷预设模版</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`p-2 rounded-xl text-xs font-semibold border text-left transition-all flex items-center gap-2 ${
                      name === p.name
                        ? 'border-zinc-900 dark:border-white bg-black/[0.04] dark:bg-white/[0.08] text-zinc-900 dark:text-white font-bold'
                        : 'border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.18] dark:hover:border-white/[0.2] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-[#202024]'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ backgroundColor: p.avatarBg, color: p.avatarBg === '#f4f4f5' ? '#18181b' : '#ffffff' }}
                    >
                      {p.avatarChar}
                    </span>
                    <span className="truncate">{p.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Provider Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              服务商名称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (!isEdit && (!avatarChar || avatarChar === 'P')) {
                  setAvatarChar(e.target.value.charAt(0) || 'P');
                }
              }}
              placeholder="例如 薄荷公益站 / 幸运小店 / SiliconFlow"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#202024] text-sm focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder-zinc-400"
            />
          </div>

          {/* Protocol & Endpoint */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                端点协议 (Protocol)
              </label>
              <div className="flex bg-black/[0.04] dark:bg-white/[0.06] p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setProtocol('openai_compatible')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    protocol === 'openai_compatible'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  OpenAI 兼容
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProtocol('google');
                    if (!baseUrl || baseUrl.includes('openai.com')) {
                      setBaseUrl('https://generativelanguage.googleapis.com');
                    }
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    protocol === 'google'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Google Gemini
                </button>
              </div>
            </div>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#202024] text-sm focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder-zinc-400 font-mono"
            />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              API 密钥 (API Key)
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="输入 API 密钥 (本地 Ollama 可留空)..."
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#202024] text-sm focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder-zinc-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* More Settings Accordion */}
          <div className="border-t border-black/[0.06] dark:border-white/[0.08] pt-2">
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="flex items-center justify-between w-full text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-1"
            >
              <span>更多设置 (自定义 Headers 请求头)</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`}
              />
            </button>
            {showMore && (
              <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
                <label className="text-xs text-zinc-400 block">
                  自定义请求头 (JSON 格式或 Key: Value 换行)：
                </label>
                <textarea
                  rows={3}
                  value={customHeadersText}
                  onChange={e => setCustomHeadersText(e.target.value)}
                  placeholder='{"HTTP-Referer": "https://tagmaster.ai", "X-Title": "Tag Master"}'
                  className="w-full p-3 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#202024] text-xs font-mono focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            {isEdit && !initialProvider?.isSystem && onDeleteProvider ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 rounded-full text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除此服务商</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-black/[0.1] dark:border-white/[0.15] text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-6 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold shadow-2xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isEdit ? '保存修改' : '添加提供商'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AddProviderModal: React.FC<AddProviderModalProps> = ({
  isOpen,
  onClose,
  onAddProvider
}) => {
  return (
    <ProviderModal
      isOpen={isOpen}
      onClose={onClose}
      onSaveProvider={onAddProvider}
      initialProvider={null}
    />
  );
};

