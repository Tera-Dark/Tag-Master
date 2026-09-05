import React, { useState } from 'react';
import { X, Eye, EyeOff, ChevronDown, Check } from 'lucide-react';
import { AiProvider, AiProtocol } from '../../types';

interface AddProviderModalProps {
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

const PRESETS: Preset[] = [
  {
    name: 'SiliconFlow (硅基流动)',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.siliconflow.cn/v1',
    avatarChar: '硅',
    avatarBg: 'bg-zinc-800'
  },
  {
    name: 'Ollama (本地部署)',
    protocol: 'openai_compatible',
    baseUrl: 'http://localhost:11434/v1',
    avatarChar: '🦙',
    avatarBg: 'bg-zinc-800'
  },
  {
    name: 'Google Gemini (官方)',
    protocol: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com',
    avatarChar: 'G',
    avatarBg: 'bg-zinc-800'
  },
  {
    name: 'OpenRouter (全球聚合)',
    protocol: 'openai_compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    avatarChar: 'R',
    avatarBg: 'bg-zinc-800'
  },
  {
    name: 'OpenAI (官方)',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.openai.com/v1',
    avatarChar: 'O',
    avatarBg: 'bg-zinc-800'
  },
  {
    name: 'DeepSeek (深度求索)',
    protocol: 'openai_compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    avatarChar: 'D',
    avatarBg: 'bg-zinc-800'
  }
];

export const AddProviderModal: React.FC<AddProviderModalProps> = ({
  isOpen,
  onClose,
  onAddProvider
}) => {
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [protocol, setProtocol] = useState<AiProtocol>('openai_compatible');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [showApiKey, setShowApiKey] = useState(false);
  const [avatarChar, setAvatarChar] = useState('P');
  const [showMore, setShowMore] = useState(false);
  const [customHeadersText, setCustomHeadersText] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (p: Preset) => {
    setName(p.name);
    setProtocol(p.protocol);
    setBaseUrl(p.baseUrl);
    setAvatarChar(p.avatarChar);
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

    const newProvider: AiProvider = {
      id: 'provider-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      protocol,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      avatar: avatarChar,
      customHeaders: headers,
      models: []
    };

    onAddProvider(newProvider);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[260] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 ease-out">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            添加自定义服务商
          </h2>
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
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center text-xl font-bold shadow-sm">
              {avatarChar}
            </div>
            <div className="text-xs text-zinc-400">选择快捷模板或自定服务商</div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              快捷预设
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all flex items-center gap-2 ${
                    name === p.name
                      ? 'border-zinc-900 dark:border-white bg-black/[0.04] dark:bg-white/[0.08] text-zinc-900 dark:text-white font-bold'
                      : 'border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.18] dark:hover:border-white/[0.2] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-[#202024]'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0">
                    {p.avatarChar}
                  </span>
                  <span className="truncate">{p.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Provider Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              提供商名称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (!avatarChar || avatarChar === 'P') {
                  setAvatarChar(e.target.value.charAt(0) || 'P');
                }
              }}
              placeholder="例如 薄荷公益站 / SiliconFlow / 本地 Ollama"
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
                    setBaseUrl('https://generativelanguage.googleapis.com');
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
              <span>更多设置 (自定义 Headers 等)</span>
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

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
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
              <span>添加提供商</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
