import React from 'react';
import { Sun, Moon, Zap, Shield, Clock, Check, Plus, X } from 'lucide-react';
import { AppSettings } from '../../../../types';

export interface GeneralSettingsTabProps {
  localSettings: AppSettings;
  setLocalSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onThemeChange: (theme: 'light' | 'dark') => void;
  t: (key: string) => string;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  localSettings,
  setLocalSettings,
  onThemeChange,
  t
}) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-white dark:bg-[#18181b]">
      {/* Language & Theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Language */}
        <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#fafafa] dark:bg-[#1a1a1e] space-y-2.5">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
            {t('language')}
          </label>
          <div className="flex bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setLocalSettings(s => ({ ...s, language: 'en' }))}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                localSettings.language === 'en'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLocalSettings(s => ({ ...s, language: 'zh' }))}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                localSettings.language === 'zh'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              中文
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#fafafa] dark:bg-[#1a1a1e] space-y-2.5">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
            {t('theme')}
          </label>
          <div className="flex bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onThemeChange('light')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                localSettings.theme === 'light'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>浅色 Light</span>
            </button>
            <button
              type="button"
              onClick={() => onThemeChange('dark')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                localSettings.theme === 'dark'
                  ? 'bg-zinc-800 text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>深色 Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rate Limit Protection & RPM Pacing */}
      <div className="p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#fafafa] dark:bg-[#1a1a1e] space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>API 速率限制保护 / RPM 挂机模式</span>
              {localSettings.rateLimitPreset === 'google_5rpm' && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Google 5 RPM 保护生效中
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              针对 Google AI Studio 免费版 (5次/分、250,000 Token/分) 严格配额。遭遇 429 配额耗尽时，系统将<b>自动计算冷却时间倒计时轮询</b>，配额恢复后无缝继续打标，绝不中断任务。
            </p>
          </div>
        </div>

        {/* Preset Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setLocalSettings(s => ({
              ...s,
              rateLimitPreset: 'unlimited',
              requestIntervalSec: 0
            }))}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              (!localSettings.rateLimitPreset || localSettings.rateLimitPreset === 'unlimited')
                ? 'border-zinc-900 dark:border-white bg-white dark:bg-[#202024] shadow-xs ring-1 ring-zinc-900/10 dark:ring-white/10'
                : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] hover:border-zinc-400'
            }`}
          >
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
              <span>🚀 无限制 (默认并发)</span>
              {(!localSettings.rateLimitPreset || localSettings.rateLimitPreset === 'unlimited') && (
                <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
              )}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 leading-normal">
              按下方并发全力运行。若偶然触发 429 仍会自动倒计时轮询恢复。
            </div>
          </button>

          <button
            type="button"
            onClick={() => setLocalSettings(s => ({
              ...s,
              rateLimitPreset: 'google_5rpm',
              concurrency: 1,
              requestIntervalSec: 12
            }))}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              localSettings.rateLimitPreset === 'google_5rpm'
                ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/30'
                : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] hover:border-zinc-400'
            }`}
          >
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Google 免费版 (5次/分)
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                挂机推荐
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
              自动锁定并发=1，每张间隔 12 秒主动平滑，全夜挂机不撞 429。
            </div>
          </button>

          <button
            type="button"
            onClick={() => setLocalSettings(s => ({
              ...s,
              rateLimitPreset: 'google_15rpm',
              concurrency: 1,
              requestIntervalSec: 4.5
            }))}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              localSettings.rateLimitPreset === 'google_15rpm'
                ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-xs ring-1 ring-blue-500/30'
                : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] hover:border-zinc-400'
            }`}
          >
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Google 升级层级 (15次/分)
              </span>
              <span className="text-[10px] font-mono bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                15 RPM
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
              每张安全间隔 4.5 秒，适用于 15 RPM 配额账户。
            </div>
          </button>

          <button
            type="button"
            onClick={() => setLocalSettings(s => ({
              ...s,
              rateLimitPreset: 'custom',
              requestIntervalSec: s.requestIntervalSec || 5
            }))}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              localSettings.rateLimitPreset === 'custom'
                ? 'border-purple-500 bg-purple-500/5 dark:bg-purple-500/10 shadow-xs ring-1 ring-purple-500/30'
                : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] hover:border-zinc-400'
            }`}
          >
            <div className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                自定义安全间隔
              </span>
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                {localSettings.requestIntervalSec || 5}s
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
              手动设定每张图片请求之间的强制冷却秒数。
            </div>
          </button>
        </div>

        {/* Custom Interval Slider if 'custom' */}
        {localSettings.rateLimitPreset === 'custom' && (
          <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">自定义安全间隔 (秒):</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">
                {localSettings.requestIntervalSec || 5} 秒
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={localSettings.requestIntervalSec || 5}
              onChange={e => setLocalSettings(s => ({ ...s, requestIntervalSec: parseInt(e.target.value) }))}
              className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>
        )}
      </div>

      {/* Concurrency Slider */}
      <div className="p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#fafafa] dark:bg-[#1a1a1e] space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>打标并发数 ({localSettings.concurrency || 3} 个线程)</span>
              {localSettings.rateLimitPreset === 'google_5rpm' && (
                <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  已根据 5 RPM 模式锁定为 1
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              同时向 AI 服务商发起的反推请求数。若遇到频繁 Rate Limit (429)，请调低并发。
            </p>
          </div>
          <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 px-3 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
            {localSettings.concurrency || 3}
          </span>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <span className="text-xs font-bold text-zinc-400 font-mono">1</span>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={localSettings.concurrency || 3}
            onChange={e => setLocalSettings(s => ({ ...s, concurrency: parseInt(e.target.value) }))}
            className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
          />
          <span className="text-xs font-bold text-zinc-400 font-mono">20</span>
        </div>
      </div>

      {/* Blocked Words Filter */}
      <div className="p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#fafafa] dark:bg-[#1a1a1e] space-y-2.5">
        <div>
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            全局屏蔽词库 (Blocked Words)
          </div>
          <p className="text-xs text-zinc-400">
            以英文逗号分隔。打标生成的描述中若包含这些词条，将被自动剔除（如水印、作者名、无关噪点等）。
          </p>
        </div>
        <textarea
          value={localSettings.blockedWords?.join(', ') || ''}
          onChange={e => setLocalSettings(s => ({
            ...s,
            blockedWords: e.target.value.split(',').map(w => w.trim()).filter(Boolean)
          }))}
          className="w-full h-24 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#202024] text-sm font-mono focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
          placeholder="username, text logo, watermark, signature..."
        />
      </div>

      {/* Advanced HTTP Headers (for OpenAI compatible) */}
      <div className="p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#fafafa] dark:bg-[#1a1a1e] space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              自定义 HTTP 请求头 (Advanced Headers)
            </div>
            <p className="text-xs text-zinc-400">
              适用于通过中转分发站或自建网关（OneAPI / NewAPI / OpenRouter）时的特殊鉴权头
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocalSettings(s => ({ ...s, customHeaders: [...(s.customHeaders || []), { key: '', value: '' }] }))}
            className="px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> 添加标头
          </button>
        </div>

        {(localSettings.customHeaders || []).map((header, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              placeholder="Header Name (如 HTTP-Referer)"
              className="flex-1 p-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#202024] text-sm font-mono focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
              value={header.key}
              onChange={e => {
                const next = [...(localSettings.customHeaders || [])];
                next[idx].key = e.target.value;
                setLocalSettings(s => ({ ...s, customHeaders: next }));
              }}
            />
            <input
              placeholder="Header Value"
              className="flex-1 p-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#202024] text-sm font-mono focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
              value={header.value}
              onChange={e => {
                const next = [...(localSettings.customHeaders || [])];
                next[idx].value = e.target.value;
                setLocalSettings(s => ({ ...s, customHeaders: next }));
              }}
            />
            <button
              type="button"
              onClick={() => {
                const next = [...(localSettings.customHeaders || [])];
                next.splice(idx, 1);
                setLocalSettings(s => ({ ...s, customHeaders: next }));
              }}
              className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
